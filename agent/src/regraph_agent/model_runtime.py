"""Model runtime abstraction — pluggable backends for inference and training.

Backend selection priority:
1. NVIDIA GPU    → llama-cpp-python (CUDA) or vLLM
2. Apple Silicon → llama-cpp-python (Metal)
3. ROCm          → llama-cpp-python (ROCm)
4. Ascend NPU    → torch_npu (PyTorch-NPU) → transformers
5. CPU fallback  → llama-cpp-python (CPU) or ctransformers
"""

from __future__ import annotations

import hashlib
import logging
import os

from dataclasses import dataclass
from pathlib import Path
from typing import Any

logger = logging.getLogger("regraph.runtime")

# Model cache directory
MODEL_CACHE_DIR = Path(os.environ.get("REGRAPH_MODEL_CACHE", Path.home() / ".regraph" / "models"))


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


# ── Tokenizer helpers ────────────────────────────────────────────────────────

def _count_tokens(text: str, tokenizer: Any = None) -> int:
    """Best-effort token count."""
    if tokenizer is not None:
        try:
            return len(tokenizer.encode(text))
        except Exception:
            pass
    # Rough approximation: ~4 chars per token
    return max(1, len(text) // 4)


# ── Chat template formatting ─────────────────────────────────────────────────

CHAT_TEMPLATES = {
    "llama": "<s>[INST] {system}{user} [/INST]",
    "chatml": "<|im_start|>system\n{system}<|im_end|>\n<|im_start|>user\n{user}<|im_end|>\n<|im_start|>assistant\n",
    "mistral": "<s>[INST] {user} [/INST]",
    "gemma": "<start_of_turn>user\n{user}<end_of_turn>\n<start_of_turn>model\n",
    "phi": "Instruct: {user}\nOutput:",
}

def _apply_chat_template(messages: list[dict], template_name: str = "chatml") -> str:
    """Convert chat messages list into a single prompt string."""
    system_content = ""
    user_parts = []

    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role == "system":
            system_content = content + "\n"
        elif role == "user":
            user_parts.append(f"User: {content}")
        elif role == "assistant":
            user_parts.append(f"Assistant: {content}")

    user_text = "\n".join(user_parts)

    tmpl = CHAT_TEMPLATES.get(template_name, CHAT_TEMPLATES["chatml"])
    try:
        return tmpl.format(system=system_content, user=user_text)
    except KeyError:
        return tmpl.format(user=user_text)


# ── Model file resolution ────────────────────────────────────────────────────

def _resolve_model_path(model_id: str) -> Path | None:
    """Resolve a model_id to a local GGUF file path."""
    MODEL_CACHE_DIR.mkdir(parents=True, exist_ok=True)

    # Direct path
    direct = Path(model_id)
    if direct.exists():
        return direct

    # In cache dir: exact filename
    candidates = [
        MODEL_CACHE_DIR / model_id,
        MODEL_CACHE_DIR / f"{model_id}.gguf",
        MODEL_CACHE_DIR / model_id.replace("/", "--"),
        MODEL_CACHE_DIR / f"{model_id.replace('/', '--')}.gguf",
    ]
    for p in candidates:
        if p.exists():
            return p

    # Search recursively in cache dir
    safe_name = model_id.replace("/", "--").lower()
    for p in MODEL_CACHE_DIR.rglob("*.gguf"):
        if safe_name in p.stem.lower() or p.stem.lower() in safe_name:
            return p

    return None


def _download_model_hf(model_id: str, filename: str | None = None) -> Path:
    """Download a GGUF model from HuggingFace Hub."""
    try:
        from huggingface_hub import hf_hub_download, list_repo_files  # type: ignore
    except ImportError:
        raise RuntimeError(
            "huggingface_hub is required to download models. "
            "Install with: pip install huggingface-hub"
        )

    MODEL_CACHE_DIR.mkdir(parents=True, exist_ok=True)

    # Auto-detect GGUF file if not specified
    if filename is None:
        try:
            files = list(list_repo_files(model_id))
            gguf_files = [f for f in files if f.endswith(".gguf")]
            if not gguf_files:
                raise RuntimeError(f"No GGUF files found in {model_id}")
            # Prefer Q4_K_M quantization, then Q5_K_M, then first available
            for pref in ["Q4_K_M", "Q5_K_M", "Q4_0", "Q8_0"]:
                matches = [f for f in gguf_files if pref in f]
                if matches:
                    filename = matches[0]
                    break
            if filename is None:
                filename = gguf_files[0]
        except Exception as e:
            raise RuntimeError(f"Cannot list files for {model_id}: {e}") from e

    logger.info("Downloading %s / %s → %s", model_id, filename, MODEL_CACHE_DIR)
    path = hf_hub_download(
        repo_id=model_id,
        filename=filename,
        cache_dir=str(MODEL_CACHE_DIR),
        local_dir=str(MODEL_CACHE_DIR / model_id.replace("/", "--")),
    )
    return Path(path)


# ── llama-cpp backend ────────────────────────────────────────────────────────

class LlamaCppHandle:
    """Model handle backed by llama-cpp-python."""

    def __init__(self, model_id: str, model_path: Path, gpu_layers: int = -1):
        from llama_cpp import Llama  # type: ignore

        self.model_id = model_id
        self.backend = "llama.cpp"

        logger.info("Loading %s (gpu_layers=%d) …", model_path.name, gpu_layers)
        self._llm = Llama(
            model_path=str(model_path),
            n_gpu_layers=gpu_layers,
            n_ctx=4096,
            n_batch=512,
            verbose=False,
        )
        logger.info("Model loaded: %s", model_id)

    def generate(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.7,
        top_p: float = 1.0,
        stop: list[str] | None = None,
    ) -> GenerateResult:
        output = self._llm(
            prompt,
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
            stop=stop or ["</s>", "<|im_end|>", "[INST]"],
            echo=False,
        )
        choice = output["choices"][0]
        usage = output.get("usage", {})
        return GenerateResult(
            text=choice["text"].strip(),
            finish_reason=choice.get("finish_reason", "stop"),
            prompt_tokens=usage.get("prompt_tokens", _count_tokens(prompt)),
            completion_tokens=usage.get("completion_tokens", _count_tokens(choice["text"])),
        )

    def generate_chat(
        self,
        messages: list[dict],
        max_tokens: int = 512,
        temperature: float = 0.7,
        top_p: float = 1.0,
    ) -> GenerateResult:
        """Use llama-cpp native chat_completion if supported."""
        try:
            output = self._llm.create_chat_completion(
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p,
            )
            choice = output["choices"][0]
            usage = output.get("usage", {})
            return GenerateResult(
                text=choice["message"]["content"].strip(),
                finish_reason=choice.get("finish_reason", "stop"),
                prompt_tokens=usage.get("prompt_tokens", 0),
                completion_tokens=usage.get("completion_tokens", 0),
            )
        except Exception:
            # Fallback to raw prompt
            prompt = _apply_chat_template(messages)
            return self.generate(prompt, max_tokens, temperature, top_p)

    def embed(self, text: str) -> list[float]:
        try:
            result = self._llm.create_embedding(text)
            data = result.get("data", [])
            if data:
                return data[0].get("embedding", [])
        except Exception as e:
            logger.warning("Embedding failed: %s", e)
        return [0.0] * 384

    def train_step(
        self,
        shard_data: bytes,
        learning_rate: float = 1e-4,
        batch_size: int = 8,
    ) -> TrainStepResult:
        # llama.cpp does not support training; this is handled by the training backend
        raise NotImplementedError(
            "llama.cpp does not support training. "
            "Use a PyTorch/transformers backend for training shards."
        )


# ── vLLM backend ─────────────────────────────────────────────────────────────

class VLLMHandle:
    """Model handle backed by vLLM (high-throughput NVIDIA inference)."""

    def __init__(self, model_id: str, gpu_memory_utilization: float = 0.85):
        from vllm import LLM, SamplingParams  # type: ignore

        self.model_id = model_id
        self.backend = "vllm"
        self._SamplingParams = SamplingParams

        logger.info("Loading vLLM model %s …", model_id)
        self._llm = LLM(
            model=model_id,
            gpu_memory_utilization=gpu_memory_utilization,
            trust_remote_code=True,
        )
        logger.info("vLLM model loaded: %s", model_id)

    def generate(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.7,
        top_p: float = 1.0,
        stop: list[str] | None = None,
    ) -> GenerateResult:
        params = self._SamplingParams(
            temperature=temperature,
            top_p=top_p,
            max_tokens=max_tokens,
            stop=stop or [],
        )
        outputs = self._llm.generate([prompt], params)
        out = outputs[0].outputs[0]
        return GenerateResult(
            text=out.text.strip(),
            finish_reason=out.finish_reason or "stop",
            prompt_tokens=len(outputs[0].prompt_token_ids),
            completion_tokens=len(out.token_ids),
        )

    def generate_chat(
        self,
        messages: list[dict],
        max_tokens: int = 512,
        temperature: float = 0.7,
        top_p: float = 1.0,
    ) -> GenerateResult:
        prompt = _apply_chat_template(messages)
        return self.generate(prompt, max_tokens, temperature, top_p)

    def embed(self, text: str) -> list[float]:
        # vLLM embedding requires separate model config
        logger.warning("vLLM embedding not configured for %s — returning zeros", self.model_id)
        return [0.0] * 384

    def train_step(self, shard_data: bytes, **kwargs) -> TrainStepResult:
        raise NotImplementedError("vLLM does not support training.")


# ── Transformers / PyTorch backend ───────────────────────────────────────────

class TransformersHandle:
    """Model handle backed by HuggingFace Transformers + PyTorch."""

    def __init__(self, model_id: str, device: str = "cpu", load_in_4bit: bool = False):
        import torch  # type: ignore
        from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig  # type: ignore

        self.model_id = model_id
        self.backend = "transformers"
        self._device = device

        logger.info("Loading transformers model %s on %s …", model_id, device)

        quant_cfg = None
        if load_in_4bit and device != "cpu":
            try:
                quant_cfg = BitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_compute_dtype=torch.float16,
                    bnb_4bit_use_double_quant=True,
                    bnb_4bit_quant_type="nf4",
                )
            except Exception:
                quant_cfg = None

        self._tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
        self._model = AutoModelForCausalLM.from_pretrained(
            model_id,
            quantization_config=quant_cfg,
            device_map="auto" if device != "cpu" else None,
            torch_dtype=torch.float16 if device != "cpu" else torch.float32,
            trust_remote_code=True,
        )
        if device == "cpu":
            self._model = self._model.to(device)
        self._model.eval()
        logger.info("Transformers model loaded: %s", model_id)

    def generate(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.7,
        top_p: float = 1.0,
        stop: list[str] | None = None,
    ) -> GenerateResult:
        import torch  # type: ignore

        inputs = self._tokenizer(prompt, return_tensors="pt").to(self._device)
        prompt_len = inputs["input_ids"].shape[1]

        with torch.no_grad():
            output_ids = self._model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p,
                do_sample=temperature > 0,
                pad_token_id=self._tokenizer.eos_token_id,
            )

        new_ids = output_ids[0][prompt_len:]
        text = self._tokenizer.decode(new_ids, skip_special_tokens=True).strip()
        return GenerateResult(
            text=text,
            finish_reason="stop",
            prompt_tokens=prompt_len,
            completion_tokens=len(new_ids),
        )

    def generate_chat(
        self,
        messages: list[dict],
        max_tokens: int = 512,
        temperature: float = 0.7,
        top_p: float = 1.0,
    ) -> GenerateResult:
        # Use tokenizer's chat template if available
        try:
            prompt = self._tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True,
            )
        except Exception:
            prompt = _apply_chat_template(messages)
        return self.generate(prompt, max_tokens, temperature, top_p)

    def embed(self, text: str) -> list[float]:
        import torch  # type: ignore

        try:
            from transformers import AutoModel  # type: ignore
            inputs = self._tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
            inputs = {k: v.to(self._device) for k, v in inputs.items()}
            with torch.no_grad():
                outputs = self._model(**inputs, output_hidden_states=True)
            last_hidden = outputs.hidden_states[-1]
            embedding = last_hidden.mean(dim=1).squeeze().cpu().float().tolist()
            return embedding
        except Exception as e:
            logger.warning("Embedding extraction failed: %s", e)
            return [0.0] * 768

    def train_step(
        self,
        shard_data: bytes,
        learning_rate: float = 1e-4,
        batch_size: int = 8,
    ) -> TrainStepResult:
        import json
        import torch  # type: ignore
        from torch.optim import AdamW  # type: ignore

        # Deserialize shard: expect JSON-lines of {"text": "..."}
        try:
            lines = shard_data.decode("utf-8").strip().split("\n")
            texts = []
            for line in lines[:batch_size]:
                item = json.loads(line)
                texts.append(item.get("text", item.get("content", str(item))))
        except Exception as e:
            raise ValueError(f"Cannot parse shard data: {e}") from e

        optimizer = AdamW(self._model.parameters(), lr=learning_rate)
        self._model.train()

        total_loss = 0.0
        for text in texts:
            enc = self._tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True,
            ).to(self._device)
            labels = enc["input_ids"].clone()
            outputs = self._model(**enc, labels=labels)
            loss = outputs.loss
            loss.backward()
            total_loss += loss.item()

        optimizer.step()
        optimizer.zero_grad()
        self._model.eval()

        avg_loss = total_loss / max(len(texts), 1)
        shard_hash = hashlib.sha256(shard_data[:256]).hexdigest()[:16]
        logger.info("Training step complete: loss=%.4f, samples=%d", avg_loss, len(texts))

        return TrainStepResult(
            hash=shard_hash,
            upload_url="",
            loss=avg_loss,
            samples_processed=len(texts),
        )


# ── ONNX Runtime backend ──────────────────────────────────────────────────────

class OnnxHandle:
    """Model handle backed by ONNX Runtime (cross-platform, DirectML on Windows)."""

    def __init__(self, model_path: str, providers: list[str] | None = None):
        import onnxruntime as ort  # type: ignore

        self.model_id = model_path
        self.backend = "onnxruntime"

        if providers is None:
            available = ort.get_available_providers()
            # Prefer DML on Windows, CUDA elsewhere, then CPU
            for pref in ["DmlExecutionProvider", "CUDAExecutionProvider", "CPUExecutionProvider"]:
                if pref in available:
                    providers = [pref, "CPUExecutionProvider"]
                    break
            if providers is None:
                providers = ["CPUExecutionProvider"]

        logger.info("Loading ONNX model %s with providers=%s", model_path, providers)
        self._session = ort.InferenceSession(model_path, providers=providers)
        self._input_names = [i.name for i in self._session.get_inputs()]
        logger.info("ONNX model loaded")

    def generate(self, prompt: str, max_tokens: int = 512, **kwargs) -> GenerateResult:
        # ONNX generation requires tokenizer + generate loop — simplified stub
        logger.warning("ONNX generate requires a tokenizer wrapper; returning empty result")
        return GenerateResult(text="", finish_reason="stop")

    def generate_chat(self, messages: list[dict], **kwargs) -> GenerateResult:
        prompt = _apply_chat_template(messages)
        return self.generate(prompt, **kwargs)

    def embed(self, text: str) -> list[float]:
        """Run embedding inference via ONNX (expects tokenized input)."""
        try:
            import numpy as np  # type: ignore
            # Minimal tokenization: word-piece approximation
            tokens = text.lower().split()[:128]
            input_ids = np.array([[hash(t) % 30000 for t in tokens]], dtype=np.int64)
            attention_mask = np.ones_like(input_ids)
            feeds = {}
            if "input_ids" in self._input_names:
                feeds["input_ids"] = input_ids
            if "attention_mask" in self._input_names:
                feeds["attention_mask"] = attention_mask
            outputs = self._session.run(None, feeds)
            embedding = outputs[0].flatten().tolist()
            return embedding
        except Exception as e:
            logger.warning("ONNX embed failed: %s", e)
            return [0.0] * 384

    def train_step(self, *args, **kwargs) -> TrainStepResult:
        raise NotImplementedError("ONNX Runtime does not support training.")


# ── Huawei Ascend NPU backend (torch_npu / CANN) ─────────────────────────────

class AscendHandle:
    """Model handle backed by torch_npu + HuggingFace Transformers for Huawei Ascend NPUs.

    Requires: pip install torch_npu transformers accelerate
    Supported hardware: Atlas 300I/300T, Atlas 800, Ascend 910/910B series.
    """

    def __init__(self, model_id: str, device: str = "npu:0", load_in_bf16: bool = True):
        import torch  # type: ignore
        import torch_npu  # type: ignore
        from transformers import AutoModelForCausalLM, AutoTokenizer  # type: ignore

        self.model_id = model_id
        self.backend = "ascend"
        self._device = device

        logger.info("Loading Ascend NPU model %s on %s …", model_id, device)

        # CANN prefers bfloat16 over float16 on Ascend 910B+
        dtype = torch.bfloat16 if load_in_bf16 else torch.float16

        self._tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
        self._model = AutoModelForCausalLM.from_pretrained(
            model_id,
            torch_dtype=dtype,
            device_map=None,  # manual placement — npu:N
            trust_remote_code=True,
        ).to(device)
        self._model.eval()
        logger.info("Ascend NPU model loaded: %s on %s", model_id, device)

    def generate(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.7,
        top_p: float = 1.0,
        stop: list[str] | None = None,
    ) -> GenerateResult:
        import torch  # type: ignore

        inputs = self._tokenizer(prompt, return_tensors="pt").to(self._device)
        prompt_len = inputs["input_ids"].shape[1]

        with torch.no_grad():
            output_ids = self._model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p,
                do_sample=temperature > 0,
                pad_token_id=self._tokenizer.eos_token_id,
            )

        new_ids = output_ids[0][prompt_len:]
        text = self._tokenizer.decode(new_ids, skip_special_tokens=True).strip()
        return GenerateResult(
            text=text,
            finish_reason="stop",
            prompt_tokens=prompt_len,
            completion_tokens=len(new_ids),
        )

    def generate_chat(
        self,
        messages: list[dict],
        max_tokens: int = 512,
        temperature: float = 0.7,
        top_p: float = 1.0,
    ) -> GenerateResult:
        try:
            prompt = self._tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True,
            )
        except Exception:
            prompt = _apply_chat_template(messages)
        return self.generate(prompt, max_tokens, temperature, top_p)

    def embed(self, text: str) -> list[float]:
        import torch  # type: ignore

        try:
            inputs = self._tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
            inputs = {k: v.to(self._device) for k, v in inputs.items()}
            with torch.no_grad():
                outputs = self._model(**inputs, output_hidden_states=True)
            last_hidden = outputs.hidden_states[-1]
            embedding = last_hidden.mean(dim=1).squeeze().cpu().float().tolist()
            return embedding
        except Exception as e:
            logger.warning("Ascend NPU embedding failed: %s", e)
            return [0.0] * 768

    def train_step(self, *args, **kwargs) -> TrainStepResult:
        raise NotImplementedError(
            "Training via torch_npu requires MindSpore or distributed training harness. "
            "Use the training_shard task only with NVIDIA/ROCm backends."
        )




class SentenceTransformerHandle:
    """Dedicated embedding model via sentence-transformers."""

    def __init__(self, model_id: str, device: str = "cpu"):
        from sentence_transformers import SentenceTransformer  # type: ignore

        self.model_id = model_id
        self.backend = "sentence-transformers"
        logger.info("Loading sentence-transformers model %s on %s", model_id, device)
        self._model = SentenceTransformer(model_id, device=device)

    def generate(self, prompt: str, **kwargs) -> GenerateResult:
        raise NotImplementedError("SentenceTransformer is an embedding-only model.")

    def generate_chat(self, messages: list[dict], **kwargs) -> GenerateResult:
        raise NotImplementedError("SentenceTransformer is an embedding-only model.")

    def embed(self, text: str) -> list[float]:
        vec = self._model.encode(text, normalize_embeddings=True)
        return vec.tolist()

    def train_step(self, *args, **kwargs) -> TrainStepResult:
        raise NotImplementedError("Use transformers backend for fine-tuning.")


# ── Unified ModelHandle ───────────────────────────────────────────────────────

class ModelHandle:
    """Unified handle that delegates to whichever backend was loaded."""

    def __init__(self, delegate: Any, model_id: str):
        self._delegate = delegate
        self.model_id = model_id
        self.backend: str = getattr(delegate, "backend", "unknown")

    def generate(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.7,
        top_p: float = 1.0,
    ) -> GenerateResult:
        return self._delegate.generate(prompt, max_tokens=max_tokens,
                                       temperature=temperature, top_p=top_p)

    def generate_chat(
        self,
        messages: list[dict],
        max_tokens: int = 512,
        temperature: float = 0.7,
        top_p: float = 1.0,
    ) -> GenerateResult:
        if hasattr(self._delegate, "generate_chat"):
            return self._delegate.generate_chat(messages, max_tokens=max_tokens,
                                                temperature=temperature, top_p=top_p)
        prompt = _apply_chat_template(messages)
        return self.generate(prompt, max_tokens, temperature, top_p)

    def embed(self, text: str) -> list[float]:
        return self._delegate.embed(text)

    def train_step(
        self,
        shard_data: bytes,
        learning_rate: float = 1e-4,
        batch_size: int = 8,
    ) -> TrainStepResult:
        return self._delegate.train_step(shard_data, learning_rate=learning_rate,
                                         batch_size=batch_size)


# ── Backend loader ────────────────────────────────────────────────────────────

def _gpu_layers_for_mode(gpu_mode: str) -> int:
    """Return n_gpu_layers for llama-cpp based on GPU mode."""
    if gpu_mode in ("nvidia", "metal", "rocm"):
        return -1   # offload all layers
    # Ascend NPU: llama.cpp has no CANN backend yet — fall back to CPU layers
    return 0        # CPU only


def load_model(model_id: str, gpu_mode: str = "disabled") -> ModelHandle:
    """Load a model using the best available backend.

    Backend selection:
    - NVIDIA: vLLM (if installed) → llama.cpp CUDA → transformers
    - Apple Silicon: llama.cpp Metal → transformers (MPS)
    - ROCm: llama.cpp ROCm → transformers
    - Ascend NPU: torch_npu → transformers (npu device)
    - CPU / fallback: llama.cpp CPU → transformers CPU → error

    For embedding-only model IDs (contains 'embed' or 'e5' or 'bge'):
    - sentence-transformers → transformers
    """
    is_embedding = any(k in model_id.lower() for k in ("embed", "e5-", "bge-", "minilm"))
    is_onnx = model_id.endswith(".onnx") or ".onnx" in model_id

    # ── ONNX ──
    if is_onnx:
        try:
            import onnxruntime  # noqa: F401
            providers = None
            if gpu_mode == "nvidia":
                providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
            elif gpu_mode == "directml":
                providers = ["DmlExecutionProvider", "CPUExecutionProvider"]
            return ModelHandle(OnnxHandle(model_id, providers), model_id)
        except ImportError:
            raise RuntimeError("onnxruntime not installed. Run: pip install onnxruntime-gpu")

    # ── Embedding-only models ──
    if is_embedding:
        try:
            from sentence_transformers import SentenceTransformer  # noqa: F401
            device = "cpu"
            if gpu_mode == "nvidia":
                import torch  # noqa: F401
                device = "cuda"
            elif gpu_mode == "metal":
                import torch  # noqa: F401
                device = "mps"
            elif gpu_mode == "ascend":
                try:
                    import torch_npu  # noqa: F401
                    device_id = int(os.environ.get("ASCEND_DEVICE_ID", "0"))
                    device = f"npu:{device_id}"
                except ImportError:
                    pass
            return ModelHandle(SentenceTransformerHandle(model_id, device), model_id)
        except ImportError:
            pass
        # Fall through to transformers

    # ── vLLM (NVIDIA high-throughput) ──
    if gpu_mode == "nvidia":
        try:
            import vllm  # noqa: F401
            # Only use vLLM for HF model IDs (not GGUF paths)
            if "/" in model_id and not model_id.endswith(".gguf"):
                logger.info("Using vLLM backend for %s", model_id)
                return ModelHandle(VLLMHandle(model_id), model_id)
        except ImportError:
            logger.debug("vLLM not installed, trying llama.cpp")
        except Exception as e:
            logger.warning("vLLM load failed (%s), trying llama.cpp", e)

    # ── llama-cpp-python (GGUF models) ──
    try:
        import llama_cpp  # noqa: F401

        # Resolve GGUF file
        model_path = _resolve_model_path(model_id)

        if model_path is None:
            # Try downloading from HuggingFace if it looks like a repo id
            if "/" in model_id and not Path(model_id).exists():
                logger.info("Model not found locally, downloading from HuggingFace: %s", model_id)
                try:
                    model_path = _download_model_hf(model_id)
                except Exception as e:
                    logger.warning("HF download failed: %s", e)

        if model_path is not None and model_path.exists():
            gpu_layers = _gpu_layers_for_mode(gpu_mode)
            logger.info("Using llama.cpp backend for %s (layers=%d)", model_id, gpu_layers)
            return ModelHandle(LlamaCppHandle(model_id, model_path, gpu_layers), model_id)
        else:
            logger.debug("No GGUF file found for %s, trying transformers", model_id)

    except ImportError:
        logger.debug("llama-cpp-python not installed")

    # ── Huawei Ascend NPU (torch_npu / CANN) ──
    if gpu_mode == "ascend":
        try:
            import torch_npu  # noqa: F401
            import torch  # noqa: F401
            import transformers  # noqa: F401

            device_id = int(os.environ.get("ASCEND_DEVICE_ID", "0"))
            npu_device = f"npu:{device_id}"
            logger.info("Using Ascend NPU backend for %s on %s (torch_npu)", model_id, npu_device)
            return ModelHandle(AscendHandle(model_id, npu_device), model_id)
        except ImportError:
            logger.warning(
                "torch_npu not installed — falling back to transformers CPU for Ascend. "
                "Install with: pip install torch_npu"
            )

    # ── HuggingFace Transformers + PyTorch ──
    try:
        import torch  # noqa: F401
        import transformers  # noqa: F401

        device = "cpu"
        load_in_4bit = False

        if gpu_mode == "nvidia":
            import torch
            if torch.cuda.is_available():
                device = "cuda"
                load_in_4bit = True
        elif gpu_mode == "metal":
            import torch
            if torch.backends.mps.is_available():
                device = "mps"
        elif gpu_mode == "rocm":
            import torch
            if torch.cuda.is_available():  # ROCm exposes CUDA interface
                device = "cuda"
        elif gpu_mode == "ascend":
            # torch_npu not available — use CPU with a warning already emitted above
            pass

        logger.info("Using transformers backend for %s on %s", model_id, device)
        return ModelHandle(TransformersHandle(model_id, device, load_in_4bit), model_id)

    except ImportError:
        pass

    raise RuntimeError(
        f"No suitable backend found for model '{model_id}'. "
        "Install at least one of: llama-cpp-python, vllm, transformers+torch. "
        "See: https://regraph.tech/docs/agent#backends"
    )
