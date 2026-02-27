"""Unit tests for tasks.py — TaskExecutor dispatch and helpers."""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from regraph_agent.tasks import TaskExecutor


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def executor():
    return TaskExecutor(gpu_mode="disabled", max_memory_pct=80)


def _make_inference_task(model="test-model", messages=None, params=None):
    return {
        "id": "task-001",
        "type": "inference",
        "payload": {
            "model": model,
            "messages": messages or [{"role": "user", "content": "Hello"}],
            "params": params or {},
        },
    }


def _make_embedding_task(model="emb-model", inputs=None):
    return {
        "id": "task-002",
        "type": "embedding",
        "payload": {
            "model": model,
            "input": inputs or ["Hello world"],
        },
    }


def _make_health_check_task():
    return {"id": "task-003", "type": "health_check", "payload": {}}


def _make_training_task(model="train-model", shard_url="https://example.com/shard.jsonl"):
    return {
        "id": "task-004",
        "type": "training_shard",
        "payload": {
            "model": model,
            "shard_url": shard_url,
            "shard_id": "shard-42",
            "hyperparams": {"learning_rate": 1e-4, "batch_size": 4},
        },
    }


# ── Mock model handle ─────────────────────────────────────────────────────────

def _make_mock_model(text="mocked response", embed_dim=384):
    from regraph_agent.model_runtime import GenerateResult, TrainStepResult

    model = MagicMock()
    model.backend = "mock"
    model.generate.return_value = GenerateResult(
        text=text, finish_reason="stop", prompt_tokens=10, completion_tokens=5
    )
    model.generate_chat.return_value = GenerateResult(
        text=text, finish_reason="stop", prompt_tokens=10, completion_tokens=5
    )
    model.embed.return_value = [0.1] * embed_dim
    model.train_step.return_value = TrainStepResult(
        hash="abc123de", upload_url="", loss=0.42, samples_processed=4
    )
    return model


# ── execute() dispatch ────────────────────────────────────────────────────────

class TestExecuteDispatch:
    def test_unknown_task_type_raises(self, executor):
        with pytest.raises(ValueError, match="Unknown task type"):
            executor.execute({"id": "x", "type": "unknown_type", "payload": {}})

    def test_returns_status_completed(self, executor):
        mock_model = _make_mock_model()
        with patch.object(executor, "_load_model", return_value=mock_model):
            result = executor.execute(_make_inference_task())
        assert result["status"] == "completed"

    def test_returns_elapsed_ms(self, executor):
        mock_model = _make_mock_model()
        with patch.object(executor, "_load_model", return_value=mock_model):
            result = executor.execute(_make_inference_task())
        assert isinstance(result["elapsed_ms"], int)
        assert result["elapsed_ms"] >= 0

    def test_reraises_on_failure(self, executor):
        with patch.object(executor, "_load_model", side_effect=RuntimeError("no backend")):
            with pytest.raises(RuntimeError, match="no backend"):
                executor.execute(_make_inference_task())


# ── Inference ─────────────────────────────────────────────────────────────────

class TestInference:
    def test_inference_result_structure(self, executor):
        mock_model = _make_mock_model("Paris is the capital of France.")
        with patch.object(executor, "_load_model", return_value=mock_model):
            out = executor.execute(_make_inference_task())
        result = out["result"]
        assert result["model"] == "test-model"
        assert len(result["choices"]) == 1
        assert result["choices"][0]["message"]["role"] == "assistant"
        assert result["choices"][0]["message"]["content"] == "Paris is the capital of France."
        assert result["choices"][0]["finish_reason"] == "stop"

    def test_inference_usage_tokens(self, executor):
        mock_model = _make_mock_model()
        with patch.object(executor, "_load_model", return_value=mock_model):
            out = executor.execute(_make_inference_task())
        usage = out["result"]["usage"]
        assert "prompt_tokens" in usage
        assert "completion_tokens" in usage
        assert usage["total_tokens"] == usage["prompt_tokens"] + usage["completion_tokens"]

    def test_inference_uses_generate_chat(self, executor):
        mock_model = _make_mock_model()
        with patch.object(executor, "_load_model", return_value=mock_model):
            executor.execute(_make_inference_task())
        mock_model.generate_chat.assert_called_once()

    def test_inference_passes_params(self, executor):
        mock_model = _make_mock_model()
        with patch.object(executor, "_load_model", return_value=mock_model):
            executor.execute(_make_inference_task(params={"max_tokens": 256, "temperature": 0.2}))
        call_kwargs = mock_model.generate_chat.call_args.kwargs
        assert call_kwargs["max_tokens"] == 256
        assert call_kwargs["temperature"] == pytest.approx(0.2)

    def test_inference_default_params(self, executor):
        mock_model = _make_mock_model()
        with patch.object(executor, "_load_model", return_value=mock_model):
            executor.execute(_make_inference_task())
        call_kwargs = mock_model.generate_chat.call_args.kwargs
        assert call_kwargs["max_tokens"] == 512
        assert call_kwargs["temperature"] == pytest.approx(0.7)


# ── Embedding ─────────────────────────────────────────────────────────────────

class TestEmbedding:
    def test_embedding_result_structure(self, executor):
        mock_model = _make_mock_model()
        with patch.object(executor, "_load_model", return_value=mock_model):
            out = executor.execute(_make_embedding_task(inputs=["hello", "world"]))
        result = out["result"]
        assert result["object"] == "list"
        assert result["model"] == "emb-model"
        assert len(result["data"]) == 2

    def test_embedding_each_item_shape(self, executor):
        mock_model = _make_mock_model()
        with patch.object(executor, "_load_model", return_value=mock_model):
            out = executor.execute(_make_embedding_task())
        item = out["result"]["data"][0]
        assert item["object"] == "embedding"
        assert item["index"] == 0
        assert len(item["embedding"]) == 384

    def test_embedding_string_input_converted_to_list(self, executor):
        """Single string input should be wrapped in a list."""
        mock_model = _make_mock_model()
        task = {
            "id": "t",
            "type": "embedding",
            "payload": {"model": "m", "input": "single string"},
        }
        with patch.object(executor, "_load_model", return_value=mock_model):
            out = executor.execute(task)
        assert len(out["result"]["data"]) == 1

    def test_embedding_usage_tokens(self, executor):
        mock_model = _make_mock_model()
        with patch.object(executor, "_load_model", return_value=mock_model):
            out = executor.execute(_make_embedding_task(inputs=["hello", "world"]))
        assert out["result"]["usage"]["total_tokens"] > 0


# ── Health check ──────────────────────────────────────────────────────────────

class TestHealthCheck:
    def test_health_check_status_healthy(self, executor):
        out = executor.execute(_make_health_check_task())
        assert out["result"]["status"] == "healthy"

    def test_health_check_has_cpu_percent(self, executor):
        out = executor.execute(_make_health_check_task())
        assert "cpu_percent" in out["result"]
        assert isinstance(out["result"]["cpu_percent"], float)

    def test_health_check_has_memory_percent(self, executor):
        out = executor.execute(_make_health_check_task())
        assert "memory_percent" in out["result"]

    def test_health_check_gpu_mode(self, executor):
        out = executor.execute(_make_health_check_task())
        assert out["result"]["gpu_mode"] == "disabled"

    def test_health_check_models_loaded(self, executor):
        out = executor.execute(_make_health_check_task())
        assert "models_loaded" in out["result"]
        assert isinstance(out["result"]["models_loaded"], list)


# ── Training shard ────────────────────────────────────────────────────────────

class TestTrainingShard:
    def test_training_result_structure(self, executor):
        mock_model = _make_mock_model()
        with patch.object(executor, "_load_model", return_value=mock_model), \
             patch.object(executor, "_download_shard", return_value=b"mock shard data"):
            out = executor.execute(_make_training_task())
        result = out["result"]
        assert result["model"] == "train-model"
        assert result["shard_id"] == "shard-42"
        assert "gradient_hash" in result
        assert isinstance(result["loss"], float)
        assert isinstance(result["samples_processed"], int)

    def test_training_calls_train_step(self, executor):
        mock_model = _make_mock_model()
        with patch.object(executor, "_load_model", return_value=mock_model), \
             patch.object(executor, "_download_shard", return_value=b"data"):
            executor.execute(_make_training_task())
        mock_model.train_step.assert_called_once()

    def test_training_passes_hyperparams(self, executor):
        mock_model = _make_mock_model()
        with patch.object(executor, "_load_model", return_value=mock_model), \
             patch.object(executor, "_download_shard", return_value=b"data"):
            executor.execute(_make_training_task())
        kwargs = mock_model.train_step.call_args.kwargs
        assert kwargs["learning_rate"] == pytest.approx(1e-4)
        assert kwargs["batch_size"] == 4


# ── Model caching ─────────────────────────────────────────────────────────────

class TestModelCaching:
    def test_model_cached_on_second_call(self, executor):
        mock_model = _make_mock_model()
        load_calls = []

        def fake_load(model_id, gpu_mode):
            load_calls.append(model_id)
            return mock_model

        with patch("regraph_agent.tasks.load_model", side_effect=fake_load):
            executor.execute(_make_inference_task(model="same-model"))
            executor.execute(_make_inference_task(model="same-model"))

        assert load_calls.count("same-model") == 1

    def test_different_models_both_loaded(self, executor):
        mock_model = _make_mock_model()
        load_calls = []

        def fake_load(model_id, gpu_mode):
            load_calls.append(model_id)
            return mock_model

        with patch("regraph_agent.tasks.load_model", side_effect=fake_load):
            executor.execute(_make_inference_task(model="model-a"))
            executor.execute(_make_inference_task(model="model-b"))

        assert "model-a" in load_calls
        assert "model-b" in load_calls

    def test_cache_eviction_at_limit(self, executor):
        """With 4+ models, oldest should be evicted (limit=3)."""
        mock_model = _make_mock_model()

        def fake_load(model_id, gpu_mode):
            return mock_model

        with patch("regraph_agent.tasks.load_model", side_effect=fake_load):
            for i in range(4):
                executor.execute(_make_inference_task(model=f"model-{i}"))

        assert len(executor._model_cache) <= 3


# ── _download_shard ───────────────────────────────────────────────────────────

class TestDownloadShard:
    def test_returns_bytes_on_success(self):
        import httpx
        mock_resp = MagicMock()
        mock_resp.content = b"shard data"
        mock_resp.raise_for_status = MagicMock()

        with patch("httpx.Client") as MockClient:
            instance = MockClient.return_value.__enter__.return_value
            instance.get.return_value = mock_resp
            result = TaskExecutor._download_shard("https://example.com/shard.bin")

        assert result == b"shard data"

    def test_raises_on_http_error(self):
        import httpx

        with patch("httpx.Client") as MockClient:
            instance = MockClient.return_value.__enter__.return_value
            instance.get.side_effect = httpx.ConnectError("unreachable")
            with pytest.raises(RuntimeError, match="Failed to download shard"):
                TaskExecutor._download_shard("https://bad.host/shard.bin")
