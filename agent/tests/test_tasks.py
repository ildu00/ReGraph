"""Unit tests for tasks.py — TaskExecutor dispatch and helpers."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from regraph_agent.tasks import TaskExecutor, _collect_ascend_metrics


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


# ── _collect_ascend_metrics ───────────────────────────────────────────────────

# Realistic npu-smi usages-info output (two NPU blocks)
_NPU_SMI_USAGES_TWO_DEVICES = """\
NPU ID : 0
    Chip Name               : Ascend 910B
    NPU Utilization (%)     : 72
    HBM Used Memory (MB)    : 32768
    HBM Total Memory (MB)   : 65536
    Temperature (°C)        : 55
    Power (W)               : 310

NPU ID : 1
    Chip Name               : Ascend 910B
    NPU Utilization (%)     : 0
    HBM Used Memory (MB)    : 1024
    HBM Total Memory (MB)   : 65536
    Temperature (°C)        : 42
    Power (W)               : 180
"""

# Single-device output using "Aicore Usage (%)" key variant (CANN 7.x)
_NPU_SMI_USAGES_AICORE_KEY = """\
NPU ID : 0
    Chip Name               : Ascend 310P
    Aicore Usage (%)        : 45
    HBM Used Memory (MB)    : 4096
    HBM Total Memory (MB)   : 16384
    Temperature (°C)        : 38
"""

# Plain `npu-smi info` fallback (no -t usages-info support)
_NPU_SMI_PLAIN_OUTPUT = """\
NPU ID : 0
    Product Name            : Atlas 300I
    HBM Used Memory (MB)    : 2048
    HBM Total Memory (MB)   : 8192
"""


def _make_run_result(stdout: str, returncode: int = 0) -> subprocess.CompletedProcess:
    return subprocess.CompletedProcess(args=[], returncode=returncode, stdout=stdout, stderr="")


class TestCollectAscendMetrics:
    """Tests for _collect_ascend_metrics() — npu-smi parsing and torch_npu fallback."""

    # ── two devices, full fields ───────────────────────────────────────────────

    def test_two_devices_returned(self):
        with patch("regraph_agent.tasks.shutil.which", return_value="/usr/bin/npu-smi"), \
             patch("regraph_agent.tasks.subprocess.run", return_value=_make_run_result(_NPU_SMI_USAGES_TWO_DEVICES)):
            result = _collect_ascend_metrics()
        assert len(result) == 2

    def test_first_device_id(self):
        with patch("regraph_agent.tasks.shutil.which", return_value="/usr/bin/npu-smi"), \
             patch("regraph_agent.tasks.subprocess.run", return_value=_make_run_result(_NPU_SMI_USAGES_TWO_DEVICES)):
            result = _collect_ascend_metrics()
        assert result[0]["id"] == 0
        assert result[1]["id"] == 1

    def test_utilization_percent(self):
        with patch("regraph_agent.tasks.shutil.which", return_value="/usr/bin/npu-smi"), \
             patch("regraph_agent.tasks.subprocess.run", return_value=_make_run_result(_NPU_SMI_USAGES_TWO_DEVICES)):
            result = _collect_ascend_metrics()
        assert result[0]["utilization_percent"] == pytest.approx(72.0)
        assert result[1]["utilization_percent"] == pytest.approx(0.0)

    def test_hbm_used_mb(self):
        with patch("regraph_agent.tasks.shutil.which", return_value="/usr/bin/npu-smi"), \
             patch("regraph_agent.tasks.subprocess.run", return_value=_make_run_result(_NPU_SMI_USAGES_TWO_DEVICES)):
            result = _collect_ascend_metrics()
        assert result[0]["hbm_used_mb"] == 32768
        assert result[1]["hbm_used_mb"] == 1024

    def test_hbm_total_mb(self):
        with patch("regraph_agent.tasks.shutil.which", return_value="/usr/bin/npu-smi"), \
             patch("regraph_agent.tasks.subprocess.run", return_value=_make_run_result(_NPU_SMI_USAGES_TWO_DEVICES)):
            result = _collect_ascend_metrics()
        assert result[0]["hbm_total_mb"] == 65536
        assert result[1]["hbm_total_mb"] == 65536

    def test_hbm_used_percent_calculated(self):
        with patch("regraph_agent.tasks.shutil.which", return_value="/usr/bin/npu-smi"), \
             patch("regraph_agent.tasks.subprocess.run", return_value=_make_run_result(_NPU_SMI_USAGES_TWO_DEVICES)):
            result = _collect_ascend_metrics()
        # 32768 / 65536 * 100 = 50.0
        assert result[0]["hbm_used_percent"] == pytest.approx(50.0)
        # 1024 / 65536 * 100 ≈ 1.6
        assert result[1]["hbm_used_percent"] == pytest.approx(1.6, abs=0.05)

    def test_temperature_c(self):
        with patch("regraph_agent.tasks.shutil.which", return_value="/usr/bin/npu-smi"), \
             patch("regraph_agent.tasks.subprocess.run", return_value=_make_run_result(_NPU_SMI_USAGES_TWO_DEVICES)):
            result = _collect_ascend_metrics()
        assert result[0]["temperature_c"] == pytest.approx(55.0)
        assert result[1]["temperature_c"] == pytest.approx(42.0)

    def test_power_w(self):
        with patch("regraph_agent.tasks.shutil.which", return_value="/usr/bin/npu-smi"), \
             patch("regraph_agent.tasks.subprocess.run", return_value=_make_run_result(_NPU_SMI_USAGES_TWO_DEVICES)):
            result = _collect_ascend_metrics()
        assert result[0]["power_w"] == pytest.approx(310.0)
        assert result[1]["power_w"] == pytest.approx(180.0)

    # ── aicore key variant (CANN 7.x) ─────────────────────────────────────────

    def test_aicore_key_parsed_as_utilization(self):
        with patch("regraph_agent.tasks.shutil.which", return_value="/usr/bin/npu-smi"), \
             patch("regraph_agent.tasks.subprocess.run", return_value=_make_run_result(_NPU_SMI_USAGES_AICORE_KEY)):
            result = _collect_ascend_metrics()
        assert len(result) == 1
        assert result[0]["utilization_percent"] == pytest.approx(45.0)
        assert result[0]["hbm_total_mb"] == 16384
        assert result[0]["hbm_used_percent"] == pytest.approx(25.0)

    # ── plain npu-smi fallback (usages-info returns empty) ────────────────────

    def test_falls_back_to_plain_npu_smi(self):
        """First subprocess call returns empty (no usages-info); second returns plain output."""
        responses = [
            _make_run_result(""),                          # -t usages-info: unsupported
            _make_run_result(_NPU_SMI_PLAIN_OUTPUT),       # plain npu-smi info
        ]
        with patch("regraph_agent.tasks.shutil.which", return_value="/usr/bin/npu-smi"), \
             patch("regraph_agent.tasks.subprocess.run", side_effect=responses):
            result = _collect_ascend_metrics()
        assert len(result) == 1
        assert result[0]["hbm_used_mb"] == 2048
        assert result[0]["hbm_total_mb"] == 8192
        assert result[0]["hbm_used_percent"] == pytest.approx(25.0)

    # ── npu-smi not found → torch_npu fallback ─────────────────────────────────

    def test_torch_npu_fallback_when_no_smi(self):
        mock_props = MagicMock()
        mock_props.total_memory = 64 * 1024 * 1024 * 1024  # 64 GB

        mock_torch_npu = MagicMock()
        mock_torch_npu.npu.device_count.return_value = 1
        mock_torch_npu.npu.get_device_properties.return_value = mock_props
        mock_torch_npu.npu.memory_stats.return_value = {
            "allocated_bytes.all.current": 8 * 1024 * 1024 * 1024  # 8 GB used
        }

        with patch("regraph_agent.tasks.shutil.which", return_value=None), \
             patch.dict("sys.modules", {"torch_npu": mock_torch_npu}):
            result = _collect_ascend_metrics()

        assert len(result) == 1
        assert result[0]["id"] == 0
        assert result[0]["hbm_total_mb"] == 64 * 1024
        assert result[0]["hbm_used_mb"] == 8 * 1024
        assert result[0]["hbm_used_percent"] == pytest.approx(12.5)

    def test_torch_npu_multi_device_fallback(self):
        mock_props = MagicMock()
        mock_props.total_memory = 32 * 1024 * 1024 * 1024

        mock_torch_npu = MagicMock()
        mock_torch_npu.npu.device_count.return_value = 4
        mock_torch_npu.npu.get_device_properties.return_value = mock_props
        mock_torch_npu.npu.memory_stats.return_value = {
            "allocated_bytes.all.current": 4 * 1024 * 1024 * 1024
        }

        with patch("regraph_agent.tasks.shutil.which", return_value=None), \
             patch.dict("sys.modules", {"torch_npu": mock_torch_npu}):
            result = _collect_ascend_metrics()

        assert len(result) == 4
        for i, entry in enumerate(result):
            assert entry["id"] == i

    # ── no hardware at all ─────────────────────────────────────────────────────

    def test_empty_list_when_nothing_available(self):
        with patch("regraph_agent.tasks.shutil.which", return_value=None), \
             patch.dict("sys.modules", {"torch_npu": None}):
            result = _collect_ascend_metrics()
        assert result == []

    # ── health_check integration ───────────────────────────────────────────────

    def test_health_check_includes_npus_key_for_ascend_mode(self):
        """TaskExecutor with gpu_mode=ascend must include 'npus' in health result."""
        ex = TaskExecutor(gpu_mode="ascend", max_memory_pct=80)
        mock_metrics = [{"id": 0, "utilization_percent": 30.0, "hbm_used_mb": 4096,
                          "hbm_total_mb": 32768, "hbm_used_percent": 12.5}]
        with patch("regraph_agent.tasks._collect_ascend_metrics", return_value=mock_metrics):
            out = ex.execute({"id": "hc", "type": "health_check", "payload": {}})
        assert "npus" in out["result"]
        assert out["result"]["npus"] == mock_metrics

    def test_health_check_no_npus_key_for_cpu_mode(self):
        """TaskExecutor with gpu_mode=disabled must NOT include 'npus'."""
        ex = TaskExecutor(gpu_mode="disabled", max_memory_pct=80)
        out = ex.execute({"id": "hc", "type": "health_check", "payload": {}})
        assert "npus" not in out["result"]
