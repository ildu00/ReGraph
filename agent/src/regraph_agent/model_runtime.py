"""Model runtime abstraction — pluggable backends for inference and training.

This module provides a unified interface for loading and running models.
In production, it delegates to real backends (llama.cpp, vLLM, ONNX Runtime).
The stub implementation allows the agent to start and respond to health checks
while real model support is integrated.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

logger = logging.getLogger("regraph.runtime")


@dataclass
class GenerateResult:
    text: str
    finish_reason: str = "stop"
    prompt_tokens: int = 0
    completion_tokens: int = 0


@dataclass
class TrainStepResult:
    hash: str
    upload_url: str
    loss: float
    samples_processed: int


class ModelHandle:
    """Handle to a loaded model — wraps the underlying runtime."""

    def __init__(self, model_id: str, backend: str):
        self.model_id = model_id
        self.backend = backend
        self._loaded = True

    def generate(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.7,
        top_p: float = 1.0,
    ) -> GenerateResult:
        """Run text generation inference."""
        # TODO: Delegate to real backend (llama-cpp-python, vllm, onnxruntime)
        logger.warning("Using stub runtime for model %s — replace with real backend", self.model_id)
        return GenerateResult(
            text=f"[stub response from {self.model_id}]",
            finish_reason="stop",
            prompt_tokens=len(prompt.split()),
            completion_tokens=8,
        )

    def embed(self, text: str) -> list[float]:
        """Generate embedding vector."""
        # TODO: Real embedding generation
        logger.warning("Using stub embedding for model %s", self.model_id)
        return [0.0] * 384  # placeholder 384-dim vector

    def train_step(
        self,
        shard_data: bytes,
        learning_rate: float = 1e-4,
        batch_size: int = 8,
    ) -> TrainStepResult:
        """Execute one training step on a data shard."""
        # TODO: Real training step with gradient computation
        import hashlib
        logger.warning("Using stub training for model %s", self.model_id)
        return TrainStepResult(
            hash=hashlib.sha256(shard_data[:64]).hexdigest()[:16],
            upload_url="",
            loss=0.0,
            samples_processed=batch_size,
        )


def load_model(model_id: str, gpu_mode: str = "disabled") -> ModelHandle:
    """Load a model using the best available backend.

    Backend selection priority:
    1. NVIDIA GPU → llama-cpp-python with CUDA or vLLM
    2. Apple Silicon → llama-cpp-python with Metal
    3. ROCm → llama-cpp-python with ROCm
    4. CPU → llama-cpp-python CPU or ONNX Runtime
    """
    backend = "stub"

    # Try to load real backends
    if gpu_mode == "nvidia":
        try:
            import llama_cpp  # noqa: F401
            backend = "llama.cpp-cuda"
            logger.info("Using llama.cpp with CUDA for %s", model_id)
        except ImportError:
            logger.info("llama-cpp-python not installed — using stub for %s", model_id)

    elif gpu_mode == "metal":
        try:
            import llama_cpp  # noqa: F401
            backend = "llama.cpp-metal"
            logger.info("Using llama.cpp with Metal for %s", model_id)
        except ImportError:
            logger.info("llama-cpp-python not installed — using stub for %s", model_id)

    elif gpu_mode == "disabled":
        try:
            import llama_cpp  # noqa: F401
            backend = "llama.cpp-cpu"
            logger.info("Using llama.cpp CPU for %s", model_id)
        except ImportError:
            logger.info("No ML runtime found — using stub for %s", model_id)

    return ModelHandle(model_id=model_id, backend=backend)
