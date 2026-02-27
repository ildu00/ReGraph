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

## Ascend NPU

Run the ReGraph agent on Huawei Ascend NPUs powered by the CANN toolkit.

### Supported Hardware

| Device | Series | Memory | Notes |
|--------|--------|--------|-------|
| Ascend 910B | Atlas 300T Pro | 64 GB HBM | Training & inference |
| Ascend 910 | Atlas 300T | 32 GB HBM | Training & inference |
| Ascend 310P | Atlas 300I Pro | 16 GB HBM | Inference-optimized |
| Ascend 310 | Atlas 300I | 8 GB HBM | Edge inference |
| Ascend 910B (server) | Atlas 800T A2 | 64 GB × 8 | Multi-NPU server |

### Prerequisites

1. **OS**: Ubuntu 20.04 / 22.04 or OpenEuler 22.03 LTS
2. **CANN Toolkit 8.x** — install from [Huawei Ascend Community](https://www.hiascend.com/software/cann/community):
   ```bash
   # Verify driver is present
   npu-smi info
   ```
3. **Python 3.10+** with pip
4. **Device nodes** — confirm `/dev/davinci*` are visible:
   ```bash
   ls /dev/davinci*
   # e.g. /dev/davinci0  /dev/davinci_manager  /dev/hisi_hdc
   ```

### Quick Start — Native Install

```bash
# Auto-detect Ascend NPU and install torch_npu extras
curl -fsSL https://regraph.tech/scripts/install.sh | bash -s -- --ascend

# Or force Ascend mode explicitly
bash install.sh --ascend --key rg_conn_xxxxx

# Verify NPU is detected
regraph-agent status
# Expected: gpu_mode: ascend, devices: [Ascend 910B ...]
```

### Quick Start — Docker

```bash
# Pull the Ascend image (CANN + torch_npu pre-installed)
docker pull ghcr.io/regraph-tech/agent:latest-ascend

# Run with Ascend runtime (requires ascend-docker-runtime installed on host)
docker run -d \
  --runtime=ascend \
  -e REGRAPH_CONNECTION_KEY=rg_conn_xxxxx \
  -v regraph-models:/data/models \
  ghcr.io/regraph-tech/agent:latest-ascend

# Alternative: manual device pass-through (no runtime plugin needed)
docker run -d \
  --device /dev/davinci0 \
  --device /dev/davinci_manager \
  --device /dev/hisi_hdc \
  -v /usr/local/Ascend/driver:/usr/local/Ascend/driver:ro \
  -e REGRAPH_CONNECTION_KEY=rg_conn_xxxxx \
  -e ASCEND_VISIBLE_DEVICES=0 \
  -v regraph-models:/data/models \
  ghcr.io/regraph-tech/agent:latest-ascend
```

### Docker Compose

```bash
# Ascend profile (single NPU)
REGRAPH_CONNECTION_KEY=rg_conn_xxxxx docker compose --profile ascend up -d

# Check logs
docker compose logs -f agent-ascend
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ASCEND_VISIBLE_DEVICES` | `all` | Comma-separated NPU indices to expose |
| `ASCEND_DEVICE_ID` | `0` | Primary NPU device index |
| `LD_LIBRARY_PATH` | `/usr/local/Ascend/driver/lib64` | CANN driver library path |

### Troubleshooting

| Symptom | Fix |
|---|---|
| `npu-smi: command not found` | Install CANN driver: `bash Ascend-cann-toolkit_*.run --install` |
| `/dev/davinci* not found` | Reboot after driver install; verify with `dmesg \| grep davinci` |
| `torch_npu import error` | Run `pip install torch_npu==2.1.0.post8 --index-url https://repo.huaweicloud.com/repository/pypi/simple/` |
| `device busy` | Check no other process holds the NPU: `npu-smi info -t proc-info -i 0` |

## License

MIT — see [LICENSE](../LICENSE)
