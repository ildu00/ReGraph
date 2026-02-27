# ReGraph Provider Agent

Decentralized AI compute node — contribute your hardware to the ReGraph network and earn RGT tokens.

## Quick Start

```bash
# Install
curl -fsSL https://regraph.tech/scripts/install.sh | bash

# Or install manually
git clone https://github.com/regraph-tech/agent.git
cd agent
pip install -e .

# Start providing compute
regraph-agent start --key YOUR_CONNECTION_KEY
```

## Requirements

- Python 3.10+
- 4 GB RAM minimum
- Linux, macOS, or Windows

### Optional (for GPU compute)

- NVIDIA GPU with CUDA 11.8+ and `nvidia-smi`
- Apple Silicon Mac (Metal support automatic)
- AMD GPU with ROCm 5.0+
- Huawei Ascend NPU with CANN 8.x driver (see [Ascend NPU](#ascend-npu) section)

## Commands

```bash
# Start agent with connection key (saves config for future runs)
regraph-agent start --key rg_conn_xxxxx

# Start agent from saved config
regraph-agent run

# Start in CPU-only mode
regraph-agent start --key rg_conn_xxxxx --cpu-only

# Check hardware detection
regraph-agent status

# Show version
regraph-agent --version
```

## Configuration

Config is stored at `~/.regraph/config.yaml` and auto-generated on first run.

```yaml
network:
  api_url: "https://api.regraph.tech"
  connection_key: "rg_conn_xxxxx"

compute:
  gpu_mode: "auto"          # auto | nvidia | rocm | metal | disabled
  max_memory_percent: 80
  max_cpu_percent: 90
  idle_only: false

provider:
  auto_update: true
  heartbeat_interval_sec: 30
  task_timeout_sec: 300
```

### Environment Variables

| Variable | Description |
|---|---|
| `REGRAPH_CONNECTION_KEY` | Override connection key |
| `REGRAPH_API_URL` | Override API endpoint |
| `REGRAPH_GPU_MODE` | Override GPU mode |

## Architecture

```
regraph-agent
├── cli.py            # Click CLI entrypoint
├── agent.py          # Main loop: register → heartbeat → poll → execute
├── api_client.py     # HTTP client for ReGraph platform API
├── config.py         # YAML + env config loader (Pydantic)
├── hardware.py       # GPU/CPU/RAM detection
├── metrics.py        # Real-time system metrics (psutil)
├── tasks.py          # Task dispatcher (inference, training, embeddings)
└── model_runtime.py  # Pluggable model backend (llama.cpp, vLLM, ONNX)
```

## Model Runtime

The agent uses a pluggable backend system. Currently supported:

| Backend | GPU | Install |
|---|---|---|
| llama.cpp (CUDA) | NVIDIA | `pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu121` |
| llama.cpp (Metal) | Apple Silicon | `pip install llama-cpp-python` |
| llama.cpp (CPU) | None | `pip install llama-cpp-python` |

Models are downloaded automatically from the ReGraph model registry when a task requires them.

## Docker

Multi-stage Dockerfile with automatic platform detection:

| Target | Base image | GPU |
|--------|-----------|-----|
| `cpu` | python:3.11-slim | ❌ CPU only |
| `nvidia` | nvidia/cuda:12.1.1-cudnn8-devel | ✅ CUDA 12.1 + vLLM |
| `metal` | python:3.11-slim | ⚠️ Metal not in Docker — use native install |
| `dev` | cpu + dev tools | ❌ CPU only |

### Quick start (auto-detect platform)

```bash
# Auto-detects NVIDIA / Apple Silicon / CPU
chmod +x run.sh && ./run.sh --key rg_conn_xxxxx
```

### Manual build

```bash
# CPU
docker build --target cpu -t regraph-agent:cpu .
docker run -d \
  -e REGRAPH_CONNECTION_KEY=rg_conn_xxxxx \
  -v regraph-models:/data/models \
  regraph-agent:cpu

# NVIDIA (requires nvidia-container-toolkit)
docker build --target nvidia -t regraph-agent:nvidia .
docker run -d --gpus all \
  -e REGRAPH_CONNECTION_KEY=rg_conn_xxxxx \
  -v regraph-models:/data/models \
  regraph-agent:nvidia
```

### Docker Compose

```bash
# CPU (default)
REGRAPH_CONNECTION_KEY=rg_conn_xxxxx docker compose up -d

# NVIDIA GPU
REGRAPH_CONNECTION_KEY=rg_conn_xxxxx docker compose --profile nvidia up -d
```

### BuildKit bake (all targets)

```bash
docker buildx bake all
```

### Apple Silicon (Metal)

Metal/MPS GPU acceleration is **not available inside Docker containers**.
For full GPU performance on Apple Silicon, install natively:

```bash
pip install "regraph-agent[metal]"
regraph-agent start --key rg_conn_xxxxx
```

## License

MIT — see [LICENSE](../LICENSE)
