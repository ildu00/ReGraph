# Changelog

All notable changes to the **ReGraph Agent** are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

<!-- CHANGELOG_INSERT_MARKER — do not remove this line, it is used by the release workflow -->

## [Unreleased]

### Added
- Huawei Ascend NPU support: `_detect_ascend()` in `hardware.py` with four detection strategies (npu-smi, ascend-dmi, torch_npu, /dev/davinci* device nodes)
- `AscendHandle` backend in `model_runtime.py` using `torch_npu` + HuggingFace Transformers (bfloat16 by default)
- `ascend` extra in `pyproject.toml`: `torch_npu>=2.1.0`
- `ascend` GPU mode added to `ComputeConfig` validation enum in `config.py`
- Tests for Ascend detection and `detect_hardware(gpu_mode="ascend")` routing in `test_hardware.py`

---

## [0.3.0] — 2025-06-10

### Added
- Python 3.12 support added to test matrix
- `--version` CLI flag now reports agent version from `pyproject.toml`
- Multi-arch Docker images (`linux/amd64` + `linux/arm64`) for CPU target via `docker buildx bake`
- NVIDIA CUDA 12.1 Docker target (`linux/amd64`) with automatic disk cleanup job
- Dev Docker target tagged as `dev` + commit SHA for nightly builds
- Smoke test job in `docker-agent.yml`: pulls built CPU image, verifies `--version` and `status` commands
- `release-agent.yml` workflow: auto-creates GitHub Releases on `agent/v*` tags with changelog from git log

### Changed
- `hardware.py`: `detect_hardware()` now prefers NVIDIA over ROCm when both are present
- `tasks.py`: default `max_tokens` raised from 256 → 512 for inference tasks
- `config.py`: heartbeat interval validation moved to Pydantic v2 `@field_validator`

### Fixed
- ROCm detection: JSON parse fallback to text scraping when `rocm-smi --json` fails
- Config YAML loader now correctly merges nested `agent:` key with flat top-level keys

---

## [0.2.1] — 2025-04-22

### Fixed
- `metrics.py`: prevent division-by-zero when `compute_time_ms` is 0
- `api_client.py`: retry logic now respects `Retry-After` header on HTTP 429

### Security
- Dependency update: `httpx` → 0.27.2 (CVE-2024-35195 mitigation)

---

## [0.2.0] — 2025-03-15

### Added
- `hardware.py`: Apple Silicon (M-series) detection via `system_profiler SPDisplaysDataType`
- `hardware.py`: DirectML detection for Windows NPU/GPU devices
- LRU model cache in `tasks.py` with configurable `model_cache_size` (default: 3)
- `model_runtime.py`: `_download_shard()` with streaming HTTP download and checksum verification
- Training shard task type: distributes gradient computation across provider devices
- Health check task type with sub-100ms target response time
- Embedding task type: text → float vector via local sentence-transformer model

### Changed
- `config.py`: GPU mode now validated as enum `["auto", "nvidia", "rocm", "apple", "directml", "cpu"]`
- Agent startup now logs detected hardware summary at INFO level
- `agent.py`: graceful shutdown on SIGTERM/SIGINT, flushes in-progress tasks before exit

### Removed
- Legacy `--gpu-id` CLI flag (replaced by `--gpu-mode` enum)

---

## [0.1.0] — 2025-01-28

### Added
- Initial public release of the ReGraph Provider Agent
- `agent.py`: main agent loop with heartbeat, task polling, and result reporting
- `api_client.py`: authenticated HTTP client for the ReGraph platform API
- `config.py`: YAML + environment variable configuration loader with Pydantic validation
- `hardware.py`: GPU detection for NVIDIA (`nvidia-smi`) and AMD ROCm (`rocm-smi`)
- `metrics.py`: token/second, latency, and utilization metrics collection
- `model_runtime.py`: GGUF model loading via `llama-cpp-python`
- `tasks.py`: task executor with `inference` and `health_check` task types
- `cli.py`: command-line interface (`start`, `status`, `version` subcommands)
- Docker support: `Dockerfile` + `docker-compose.yml` for CPU target
- Install scripts: `install.sh` (Linux/macOS) and `install.ps1` (Windows PowerShell)

---

[Unreleased]: https://github.com/ReGraph-AI/regraph/compare/agent/v0.3.0...HEAD
[0.3.0]: https://github.com/ReGraph-AI/regraph/compare/agent/v0.2.1...agent/v0.3.0
[0.2.1]: https://github.com/ReGraph-AI/regraph/compare/agent/v0.2.0...agent/v0.2.1
[0.2.0]: https://github.com/ReGraph-AI/regraph/compare/agent/v0.1.0...agent/v0.2.0
[0.1.0]: https://github.com/ReGraph-AI/regraph/releases/tag/agent/v0.1.0
