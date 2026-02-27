"""Core agent loop — heartbeat, task polling, execution."""

from __future__ import annotations

import logging
import signal
import threading
import time

from regraph_agent import __version__
from regraph_agent.api_client import APIError, ReGraphAPI
from regraph_agent.config import AgentConfig
from regraph_agent.hardware import detect_hardware
from regraph_agent.metrics import collect as collect_metrics
from regraph_agent.tasks import TaskExecutor

logger = logging.getLogger("regraph.agent")


class Agent:
    """Main agent process — registers, heartbeats, polls and executes tasks."""

    def __init__(self, config: AgentConfig):
        self.config = config
        self.device_id: str | None = None
        self._running = False
        self._stop_event = threading.Event()

        self.api = ReGraphAPI(
            base_url=config.network.api_url,
            connection_key=config.network.connection_key,
            agent_version=__version__,
        )
        self.executor = TaskExecutor(
            gpu_mode=config.compute.gpu_mode,
            max_memory_pct=config.compute.max_memory_percent,
        )

    def start(self) -> None:
        """Start the agent main loop."""
        self._running = True
        self._install_signal_handlers()

        logger.info("ReGraph Agent v%s starting...", __version__)

        # 1. Detect hardware
        hw = detect_hardware(self.config.compute.gpu_mode)
        logger.info(
            "Hardware: %s (%s), %d cores, %d MB RAM, GPU: %s",
            hw.hostname, hw.arch, hw.cpu_cores, hw.ram_total_mb, hw.gpu_mode,
        )
        if hw.gpus:
            for g in hw.gpus:
                logger.info("  GPU: %s (%d MB VRAM, %s)", g.name, g.vram_mb, g.backend)

        # Update config with detected GPU mode
        self.config.compute.gpu_mode = hw.gpu_mode

        # 2. Register device
        self._register(hw)

        # 3. Start heartbeat thread
        hb_thread = threading.Thread(target=self._heartbeat_loop, daemon=True)
        hb_thread.start()

        # 4. Task loop
        self._task_loop()

    def stop(self) -> None:
        """Gracefully stop the agent."""
        logger.info("Shutting down...")
        self._running = False
        self._stop_event.set()
        self.api.close()

    # ── Registration ──────────────────────────────────────
    def _register(self, hw) -> None:
        max_retries = 5
        for attempt in range(1, max_retries + 1):
            try:
                resp = self.api.register_device(hw.summary())
                self.device_id = resp.get("device_id")
                logger.info("Registered as device %s", self.device_id)
                return
            except APIError as e:
                logger.error("Registration failed (attempt %d/%d): %s", attempt, max_retries, e)
                if attempt == max_retries:
                    raise RuntimeError("Failed to register device after max retries") from e
                time.sleep(min(2**attempt, 30))

    # ── Heartbeat ─────────────────────────────────────────
    def _heartbeat_loop(self) -> None:
        interval = self.config.provider.heartbeat_interval_sec
        gpu_mode = self.config.compute.gpu_mode

        while self._running and not self._stop_event.is_set():
            try:
                metrics = collect_metrics()

                # Attach live Ascend NPU metrics so the platform gets fresh
                # utilization data every heartbeat without waiting for health_check.
                if gpu_mode == "ascend":
                    from regraph_agent.tasks import _collect_ascend_metrics
                    npu_metrics = _collect_ascend_metrics()
                    if npu_metrics:
                        metrics["npus"] = npu_metrics
                        # Convenience aggregate: avg utilisation across all NPUs
                        util_values = [
                            m["utilization_percent"]
                            for m in npu_metrics
                            if "utilization_percent" in m
                        ]
                        if util_values:
                            metrics["npu_utilization_avg_percent"] = round(
                                sum(util_values) / len(util_values), 1
                            )

                self.api.heartbeat(self.device_id, metrics)
                logger.debug(
                    "Heartbeat sent (cpu=%.1f%%, mem=%.1f%%%s)",
                    metrics["cpu_percent"],
                    metrics["memory_percent"],
                    f", npu_avg={metrics['npu_utilization_avg_percent']}%"
                    if "npu_utilization_avg_percent" in metrics else "",
                )
            except APIError as e:
                logger.warning("Heartbeat failed: %s", e)
            except Exception as e:
                logger.error("Heartbeat error: %s", e)

            self._stop_event.wait(interval)

    # ── Task loop ─────────────────────────────────────────
    def _task_loop(self) -> None:
        poll_interval = 2  # seconds between polls when idle
        max_poll_interval = 30

        logger.info("Listening for tasks...")

        while self._running and not self._stop_event.is_set():
            try:
                task = self.api.poll_task(self.device_id)

                if task is None:
                    # No task available — back off
                    poll_interval = min(poll_interval * 1.5, max_poll_interval)
                    self._stop_event.wait(poll_interval)
                    continue

                # Reset poll interval when we get work
                poll_interval = 2

                task_id = task.get("id", "unknown")
                task_type = task.get("type", "unknown")
                logger.info("Received task %s (type=%s)", task_id, task_type)

                try:
                    result = self.executor.execute(task)
                    self.api.submit_result(self.device_id, task_id, result)
                    logger.info("Task %s submitted successfully", task_id)
                except Exception as exc:
                    logger.error("Task %s execution failed: %s", task_id, exc)
                    try:
                        self.api.report_failure(self.device_id, task_id, str(exc))
                    except Exception:
                        logger.error("Failed to report task failure")

            except APIError as e:
                logger.warning("Task poll error: %s", e)
                self._stop_event.wait(10)
            except Exception as e:
                logger.error("Unexpected error in task loop: %s", e)
                self._stop_event.wait(10)

    # ── Signal handling ───────────────────────────────────
    def _install_signal_handlers(self) -> None:
        def _handle_shutdown(signum, _frame):
            sig_name = signal.Signals(signum).name
            logger.info("Received %s — stopping agent", sig_name)
            self.stop()

        signal.signal(signal.SIGINT, _handle_shutdown)
        signal.signal(signal.SIGTERM, _handle_shutdown)
