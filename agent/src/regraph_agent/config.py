"""Agent configuration loader."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel, Field


class NetworkConfig(BaseModel):
    api_url: str = "https://api.regraph.tech"
    connection_key: str = ""


class ComputeConfig(BaseModel):
    gpu_mode: Literal["auto", "nvidia", "rocm", "metal", "directml", "disabled"] = "auto"
    max_memory_percent: int = Field(default=80, ge=10, le=100)
    max_cpu_percent: int = Field(default=90, ge=10, le=100)
    idle_only: bool = False


class LoggingConfig(BaseModel):
    level: Literal["debug", "info", "warning", "error"] = "info"
    directory: str = ""
    max_size_mb: int = 100


class ProviderConfig(BaseModel):
    auto_update: bool = True
    heartbeat_interval_sec: int = Field(default=30, ge=5, le=300)
    task_timeout_sec: int = Field(default=300, ge=30, le=3600)


class AgentConfig(BaseModel):
    network: NetworkConfig = NetworkConfig()
    compute: ComputeConfig = ComputeConfig()
    logging: LoggingConfig = LoggingConfig()
    provider: ProviderConfig = ProviderConfig()

    @classmethod
    def load(cls, path: str | Path | None = None) -> AgentConfig:
        """Load config from YAML file, env vars, or defaults."""
        data: dict = {}

        # 1. File
        if path and Path(path).exists():
            with open(path) as f:
                raw = yaml.safe_load(f) or {}
                # Flatten nested 'agent' key if present
                data = raw.get("agent", raw) if "agent" in raw else raw

        # 2. Env overrides
        if key := os.getenv("REGRAPH_CONNECTION_KEY"):
            data.setdefault("network", {})["connection_key"] = key
        if url := os.getenv("REGRAPH_API_URL"):
            data.setdefault("network", {})["api_url"] = url
        if gpu := os.getenv("REGRAPH_GPU_MODE"):
            data.setdefault("compute", {})["gpu_mode"] = gpu

        return cls.model_validate(data)

    def save(self, path: str | Path) -> None:
        """Persist config to YAML."""
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "w") as f:
            yaml.dump(self.model_dump(), f, default_flow_style=False, sort_keys=False)
