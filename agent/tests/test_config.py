"""Unit tests for config.py — AgentConfig loading and validation."""

from __future__ import annotations

import os
import sys
import textwrap
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from regraph_agent.config import AgentConfig, ComputeConfig, NetworkConfig, ProviderConfig


# ── Defaults ─────────────────────────────────────────────────────────────────

class TestDefaults:
    def test_default_api_url(self):
        cfg = AgentConfig()
        assert cfg.network.api_url == "https://api.regraph.tech"

    def test_default_connection_key_empty(self):
        cfg = AgentConfig()
        assert cfg.network.connection_key == ""

    def test_default_gpu_mode(self):
        cfg = AgentConfig()
        assert cfg.compute.gpu_mode == "auto"

    def test_default_heartbeat_interval(self):
        cfg = AgentConfig()
        assert cfg.provider.heartbeat_interval_sec == 30

    def test_default_task_timeout(self):
        cfg = AgentConfig()
        assert cfg.provider.task_timeout_sec == 300

    def test_default_max_memory(self):
        cfg = AgentConfig()
        assert cfg.compute.max_memory_percent == 80

    def test_default_auto_update(self):
        cfg = AgentConfig()
        assert cfg.provider.auto_update is True


# ── Validation ───────────────────────────────────────────────────────────────

class TestValidation:
    def test_gpu_mode_valid_values(self):
        for mode in ("auto", "nvidia", "rocm", "metal", "directml", "disabled"):
            cfg = AgentConfig(compute=ComputeConfig(gpu_mode=mode))
            assert cfg.compute.gpu_mode == mode

    def test_gpu_mode_invalid_raises(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            AgentConfig(compute=ComputeConfig(gpu_mode="unknown_backend"))

    def test_memory_percent_lower_bound(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            ComputeConfig(max_memory_percent=5)

    def test_memory_percent_upper_bound(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            ComputeConfig(max_memory_percent=101)

    def test_memory_percent_boundary_valid(self):
        low = ComputeConfig(max_memory_percent=10)
        high = ComputeConfig(max_memory_percent=100)
        assert low.max_memory_percent == 10
        assert high.max_memory_percent == 100

    def test_heartbeat_min(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            ProviderConfig(heartbeat_interval_sec=4)

    def test_heartbeat_max(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            ProviderConfig(heartbeat_interval_sec=301)


# ── Load from YAML ────────────────────────────────────────────────────────────

class TestLoadFromYaml:
    def test_loads_minimal_yaml(self, tmp_path):
        cfg_file = tmp_path / "config.yaml"
        cfg_file.write_text(textwrap.dedent("""\
            network:
              connection_key: "rg_conn_test123"
        """))
        cfg = AgentConfig.load(cfg_file)
        assert cfg.network.connection_key == "rg_conn_test123"
        assert cfg.network.api_url == "https://api.regraph.tech"  # default preserved

    def test_loads_full_yaml(self, tmp_path):
        cfg_file = tmp_path / "config.yaml"
        cfg_file.write_text(textwrap.dedent("""\
            network:
              api_url: "https://staging.api.regraph.tech"
              connection_key: "rg_conn_staging"
            compute:
              gpu_mode: "nvidia"
              max_memory_percent: 70
              max_cpu_percent: 85
              idle_only: true
            provider:
              heartbeat_interval_sec: 60
              task_timeout_sec: 600
              auto_update: false
        """))
        cfg = AgentConfig.load(cfg_file)
        assert cfg.network.api_url == "https://staging.api.regraph.tech"
        assert cfg.compute.gpu_mode == "nvidia"
        assert cfg.compute.max_memory_percent == 70
        assert cfg.compute.idle_only is True
        assert cfg.provider.heartbeat_interval_sec == 60
        assert cfg.provider.auto_update is False

    def test_load_nonexistent_file_uses_defaults(self, tmp_path):
        cfg = AgentConfig.load(tmp_path / "nonexistent.yaml")
        assert cfg.network.api_url == "https://api.regraph.tech"

    def test_load_nested_agent_key(self, tmp_path):
        """Some YAML writers wrap config under an 'agent' key."""
        cfg_file = tmp_path / "config.yaml"
        cfg_file.write_text(textwrap.dedent("""\
            agent:
              network:
                connection_key: "rg_conn_nested"
        """))
        cfg = AgentConfig.load(cfg_file)
        assert cfg.network.connection_key == "rg_conn_nested"

    def test_load_empty_yaml(self, tmp_path):
        cfg_file = tmp_path / "config.yaml"
        cfg_file.write_text("")
        cfg = AgentConfig.load(cfg_file)
        assert cfg.network.api_url == "https://api.regraph.tech"


# ── Environment variable overrides ───────────────────────────────────────────

class TestEnvOverrides:
    def test_connection_key_from_env(self, tmp_path, monkeypatch):
        monkeypatch.setenv("REGRAPH_CONNECTION_KEY", "rg_env_key")
        cfg = AgentConfig.load(None)
        assert cfg.network.connection_key == "rg_env_key"

    def test_api_url_from_env(self, tmp_path, monkeypatch):
        monkeypatch.setenv("REGRAPH_API_URL", "https://custom.api.test")
        cfg = AgentConfig.load(None)
        assert cfg.network.api_url == "https://custom.api.test"

    def test_gpu_mode_from_env(self, monkeypatch):
        monkeypatch.setenv("REGRAPH_GPU_MODE", "disabled")
        cfg = AgentConfig.load(None)
        assert cfg.compute.gpu_mode == "disabled"

    def test_env_overrides_yaml(self, tmp_path, monkeypatch):
        cfg_file = tmp_path / "config.yaml"
        cfg_file.write_text("network:\n  connection_key: file_key\n")
        monkeypatch.setenv("REGRAPH_CONNECTION_KEY", "env_key")
        cfg = AgentConfig.load(cfg_file)
        assert cfg.network.connection_key == "env_key"

    def test_no_env_vars_uses_yaml(self, tmp_path, monkeypatch):
        for var in ("REGRAPH_CONNECTION_KEY", "REGRAPH_API_URL", "REGRAPH_GPU_MODE"):
            monkeypatch.delenv(var, raising=False)
        cfg_file = tmp_path / "config.yaml"
        cfg_file.write_text("network:\n  connection_key: yaml_key\n")
        cfg = AgentConfig.load(cfg_file)
        assert cfg.network.connection_key == "yaml_key"


# ── Save / round-trip ─────────────────────────────────────────────────────────

class TestSave:
    def test_save_creates_file(self, tmp_path):
        cfg = AgentConfig(network=NetworkConfig(connection_key="rg_save_test"))
        cfg.save(tmp_path / "out.yaml")
        assert (tmp_path / "out.yaml").exists()

    def test_save_round_trip(self, tmp_path):
        original = AgentConfig(
            network=NetworkConfig(connection_key="rg_rt", api_url="https://rt.test"),
            compute=ComputeConfig(gpu_mode="metal", max_memory_percent=60),
        )
        path = tmp_path / "rt.yaml"
        original.save(path)
        loaded = AgentConfig.load(path)
        assert loaded.network.connection_key == "rg_rt"
        assert loaded.network.api_url == "https://rt.test"
        assert loaded.compute.gpu_mode == "metal"
        assert loaded.compute.max_memory_percent == 60

    def test_save_creates_parent_dirs(self, tmp_path):
        nested = tmp_path / "deep" / "nested" / "config.yaml"
        AgentConfig().save(nested)
        assert nested.exists()
