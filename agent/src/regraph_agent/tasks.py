"""Task execution engine — handles inference and training shard tasks."""

from __future__ import annotations

import logging
import time
from typing import Any

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
        """Run an inference request on a loaded model."""
        model_id = task["payload"]["model"]
        messages = task["payload"].get("messages", [])
        params = task["payload"].get("params", {})

        model = self._load_model(model_id)

        # Tokenize input
        prompt = self._format_messages(messages)
        logger.debug("Inference prompt length: %d chars", len(prompt))

        # Run inference
        output = model.generate(
            prompt,
            max_tokens=params.get("max_tokens", 512),
            temperature=params.get("temperature", 0.7),
            top_p=params.get("top_p", 1.0),
        )

        return {
            "model": model_id,
            "choices": [{
                "message": {"role": "assistant", "content": output.text},
                "finish_reason": output.finish_reason,
            }],
            "usage": {
                "prompt_tokens": output.prompt_tokens,
                "completion_tokens": output.completion_tokens,
                "total_tokens": output.prompt_tokens + output.completion_tokens,
            },
        }

    def _run_training_shard(self, task: dict) -> dict:
        """Process a training shard — forward/backward pass on a data slice."""
        model_id = task["payload"]["model"]
        shard_url = task["payload"]["shard_url"]
        hyperparams = task["payload"].get("hyperparams", {})

        model = self._load_model(model_id)

        logger.info("Downloading shard from %s", shard_url)
        shard_data = self._download_shard(shard_url)

        # Run training step
        gradients = model.train_step(
            shard_data,
            learning_rate=hyperparams.get("learning_rate", 1e-4),
            batch_size=hyperparams.get("batch_size", 8),
        )

        return {
            "model": model_id,
            "shard_id": task["payload"].get("shard_id"),
            "gradient_hash": gradients.hash,
            "gradient_url": gradients.upload_url,
            "loss": gradients.loss,
            "samples_processed": gradients.samples_processed,
        }

    def _run_embedding(self, task: dict) -> dict:
        """Generate embeddings for input text."""
        model_id = task["payload"]["model"]
        inputs = task["payload"]["input"]
        if isinstance(inputs, str):
            inputs = [inputs]

        model = self._load_model(model_id)

        embeddings = []
        for i, text in enumerate(inputs):
            vec = model.embed(text)
            embeddings.append({"object": "embedding", "index": i, "embedding": vec})

        return {
            "model": model_id,
            "data": embeddings,
            "usage": {"prompt_tokens": sum(len(t.split()) for t in inputs)},
        }

    def _run_health_check(self, _task: dict) -> dict:
        """Lightweight health check — confirms agent can execute tasks."""
        import psutil
        return {
            "status": "healthy",
            "cpu_percent": psutil.cpu_percent(interval=0.5),
            "memory_percent": psutil.virtual_memory().percent,
            "gpu_mode": self.gpu_mode,
        }

    # ── Helpers ───────────────────────────────────────────

    def _load_model(self, model_id: str) -> Any:
        """Load a model into memory (with caching)."""
        if model_id in self._model_cache:
            logger.debug("Model %s loaded from cache", model_id)
            return self._model_cache[model_id]

        logger.info("Loading model %s ...", model_id)

        # In production this integrates with llama.cpp, vLLM, ONNX Runtime, etc.
        # For now we use a stub that will be replaced with real model loading.
        from regraph_agent.model_runtime import load_model
        model = load_model(model_id, gpu_mode=self.gpu_mode)

        self._model_cache[model_id] = model
        logger.info("Model %s loaded successfully", model_id)
        return model

    @staticmethod
    def _format_messages(messages: list[dict]) -> str:
        """Convert chat messages to a prompt string."""
        parts = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            parts.append(f"<|{role}|>\n{content}")
        parts.append("<|assistant|>\n")
        return "\n".join(parts)

    @staticmethod
    def _download_shard(url: str) -> Any:
        """Download training shard data from a URL."""
        import httpx
        resp = httpx.get(url, timeout=120)
        resp.raise_for_status()
        return resp.content
