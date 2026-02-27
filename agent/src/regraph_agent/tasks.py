"""Task execution engine — handles inference, embedding, training and health checks."""

from __future__ import annotations

import logging
import time
from typing import Any

import psutil

logger = logging.getLogger("regraph.tasks")


class TaskExecutor:
    """Dispatches and executes tasks received from the network."""

    def __init__(self, gpu_mode: str, max_memory_pct: int):
        self.gpu_mode = gpu_mode
        self.max_memory_pct = max_memory_pct
        self._model_cache: dict[str, Any] = {}

    def execute(self, task: dict) -> dict:
        """Execute a task and return the result payload."""
        task_type = task.get("type", "unknown")
        task_id = task.get("id", "?")

        logger.info("Executing task %s (type=%s)", task_id, task_type)
        start = time.monotonic()

        try:
            if task_type == "inference":
                result = self._run_inference(task)
            elif task_type == "training_shard":
                result = self._run_training_shard(task)
            elif task_type == "embedding":
                result = self._run_embedding(task)
            elif task_type == "health_check":
                result = self._run_health_check(task)
            else:
                raise ValueError(f"Unknown task type: {task_type}")

            elapsed_ms = int((time.monotonic() - start) * 1000)
            logger.info("Task %s completed in %dms", task_id, elapsed_ms)

            return {
                "status": "completed",
                "elapsed_ms": elapsed_ms,
                "result": result,
            }

        except Exception as exc:
            elapsed_ms = int((time.monotonic() - start) * 1000)
            logger.error("Task %s failed after %dms: %s", task_id, elapsed_ms, exc)
            raise

    # ── Task handlers ─────────────────────────────────────

    def _run_inference(self, task: dict) -> dict:
        """Run a chat inference request."""
        payload = task.get("payload", {})
        model_id = payload["model"]
        messages = payload.get("messages", [])
        params = payload.get("params", {})

        model = self._load_model(model_id)

        # Guard against memory pressure before loading heavy inference
        self._check_memory()

        logger.debug("Inference: model=%s, messages=%d", model_id, len(messages))

        # Use native chat API if available (produces better results)
        output = model.generate_chat(
            messages=messages,
            max_tokens=params.get("max_tokens", 512),
            temperature=params.get("temperature", 0.7),
            top_p=params.get("top_p", 1.0),
        )

        return {
            "model": model_id,
            "choices": [{
                "message": {"role": "assistant", "content": output.text},
                "finish_reason": output.finish_reason,
                "index": 0,
            }],
            "usage": {
                "prompt_tokens": output.prompt_tokens,
                "completion_tokens": output.completion_tokens,
                "total_tokens": output.prompt_tokens + output.completion_tokens,
            },
        }

    def _run_training_shard(self, task: dict) -> dict:
        """Process a training shard — forward/backward pass on a data slice."""
        payload = task.get("payload", {})
        model_id = payload["model"]
        shard_url = payload["shard_url"]
        hyperparams = payload.get("hyperparams", {})

        model = self._load_model(model_id)

        logger.info("Downloading training shard from %s", shard_url)
        shard_data = self._download_shard(shard_url)

        result = model.train_step(
            shard_data,
            learning_rate=hyperparams.get("learning_rate", 1e-4),
            batch_size=hyperparams.get("batch_size", 8),
        )

        return {
            "model": model_id,
            "shard_id": payload.get("shard_id"),
            "gradient_hash": result.hash,
            "gradient_url": result.upload_url,
            "loss": result.loss,
            "samples_processed": result.samples_processed,
        }

    def _run_embedding(self, task: dict) -> dict:
        """Generate embeddings for one or more input strings."""
        payload = task.get("payload", {})
        model_id = payload["model"]
        inputs = payload["input"]
        if isinstance(inputs, str):
            inputs = [inputs]

        model = self._load_model(model_id)

        embeddings = []
        total_tokens = 0
        for i, text in enumerate(inputs):
            vec = model.embed(text)
            embeddings.append({
                "object": "embedding",
                "index": i,
                "embedding": vec,
            })
            total_tokens += max(1, len(text) // 4)

        return {
            "object": "list",
            "model": model_id,
            "data": embeddings,
            "usage": {"prompt_tokens": total_tokens, "total_tokens": total_tokens},
        }

    def _run_health_check(self, _task: dict) -> dict:
        """Lightweight health check — confirms agent can execute tasks."""
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage("/")

        result: dict = {
            "status": "healthy",
            "cpu_percent": psutil.cpu_percent(interval=0.5),
            "memory_percent": mem.percent,
            "memory_available_mb": int(mem.available / (1024 * 1024)),
            "disk_free_gb": round(disk.free / (1024 ** 3), 1),
            "gpu_mode": self.gpu_mode,
            "models_loaded": list(self._model_cache.keys()),
        }

        # NVIDIA GPU metrics
        try:
            import GPUtil  # type: ignore
            gpus = GPUtil.getGPUs()
            if gpus:
                result["gpus"] = [
                    {
                        "id": g.id,
                        "name": g.name,
                        "load_percent": round(g.load * 100, 1),
                        "memory_used_mb": int(g.memoryUsed),
                        "memory_total_mb": int(g.memoryTotal),
                        "temperature_c": g.temperature,
                    }
                    for g in gpus
                ]
        except ImportError:
            pass

        # Ascend NPU metrics
        if self.gpu_mode == "ascend":
            npu_metrics = _collect_ascend_metrics()
            if npu_metrics:
                result["npus"] = npu_metrics

        # MPS (Apple Silicon)
        try:
            import torch  # type: ignore
            if torch.backends.mps.is_available():
                result["mps_available"] = True
        except ImportError:
            pass

        return result

    # ── Helpers ───────────────────────────────────────────

    def _load_model(self, model_id: str) -> Any:
        """Load a model into memory with LRU-style caching."""
        if model_id in self._model_cache:
            logger.debug("Model %s served from cache", model_id)
            return self._model_cache[model_id]

        # Evict least recently used model if memory is tight
        if len(self._model_cache) >= 3:
            oldest_key = next(iter(self._model_cache))
            logger.info("Evicting model %s from cache (memory limit)", oldest_key)
            del self._model_cache[oldest_key]

        logger.info("Loading model %s …", model_id)
        from regraph_agent.model_runtime import load_model
        model = load_model(model_id, gpu_mode=self.gpu_mode)
        self._model_cache[model_id] = model
        logger.info("Model %s loaded (backend=%s)", model_id, model.backend)
        return model

    def _check_memory(self) -> None:
        """Warn if memory usage is above the configured threshold."""
        pct = psutil.virtual_memory().percent
        if pct > self.max_memory_pct:
            logger.warning(
                "Memory usage %.1f%% exceeds threshold %d%% — consider reducing max_memory_percent",
                pct, self.max_memory_pct,
            )

    @staticmethod
    def _download_shard(url: str) -> bytes:
        """Download a training shard from a URL with retry logic."""
        import httpx

        for attempt in range(1, 4):
            try:
                with httpx.Client(timeout=120) as client:
                    resp = client.get(url, follow_redirects=True)
                    resp.raise_for_status()
                    return resp.content
            except httpx.HTTPError as e:
                if attempt == 3:
                    raise RuntimeError(f"Failed to download shard after 3 attempts: {e}") from e
                logger.warning("Shard download attempt %d failed: %s — retrying", attempt, e)
                time.sleep(2 ** attempt)
        raise RuntimeError("Shard download failed")  # unreachable
