# ============================================================
# ReGraph Provider Agent — Multi-stage Dockerfile
#
# Targets:
#   base      — CPU-only (any x86_64 / arm64)
#   cpu       — CPU target alias
#   nvidia    — CUDA 12.1 + llama.cpp CUDA + vLLM
#   ascend    — Huawei Ascend NPU (CANN 8.x) + torch_npu
#   metal     — macOS Apple Silicon hint (CPU image + Metal note)
#   dev       — base + dev tools for local development
#
# Usage:
#   docker build --target cpu    -t regraph-agent:cpu    .
#   docker build --target nvidia -t regraph-agent:nvidia .
#   docker build --target ascend -t regraph-agent:ascend .
#
#   # NVIDIA  (requires nvidia-container-toolkit)
#   docker run --gpus all -e REGRAPH_CONNECTION_KEY=rg_conn_xxx regraph-agent:nvidia
#
#   # Ascend  (requires Ascend Docker Runtime — ascend-docker-runtime)
#   docker run --device /dev/davinci0 --device /dev/davinci_manager \
#              -e REGRAPH_CONNECTION_KEY=rg_conn_xxx regraph-agent:ascend
#
#   # CPU
#   docker run -e REGRAPH_CONNECTION_KEY=rg_conn_xxx regraph-agent:cpu
# ============================================================


# ── Shared Python base ───────────────────────────────────────────────────────
FROM python:3.11-slim AS python-base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    REGRAPH_MODEL_CACHE=/data/models

RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
        git \
        procps \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy project metadata first for layer caching
COPY pyproject.toml ./
COPY src/ ./src/


# ── CPU base ─────────────────────────────────────────────────────────────────
FROM python-base AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        cmake \
        libopenblas-dev \
    && rm -rf /var/lib/apt/lists/*

# Install llama-cpp-python (CPU-only build)
RUN CMAKE_ARGS="-DLLAMA_BLAS=ON -DLLAMA_BLAS_VENDOR=OpenBLAS" \
    pip install --no-cache-dir llama-cpp-python>=0.2.90

# Install core + CPU extras
RUN pip install --no-cache-dir -e ".[cpu]"

# Create non-root user
RUN useradd -m -u 1000 agent && \
    mkdir -p /data/models /home/agent/.regraph && \
    chown -R agent:agent /data /home/agent /app

USER agent

VOLUME ["/data/models", "/home/agent/.regraph"]
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD regraph-agent status || exit 1

ENTRYPOINT ["regraph-agent"]
CMD ["run"]


# ── CPU target alias (explicit --target cpu) ──────────────────────────────────
FROM base AS cpu


# ── NVIDIA CUDA 12.1 ─────────────────────────────────────────────────────────
FROM nvidia/cuda:12.1.1-cudnn8-devel-ubuntu22.04 AS nvidia

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DEBIAN_FRONTEND=noninteractive \
    CUDA_HOME=/usr/local/cuda \
    PATH="/usr/local/cuda/bin:${PATH}" \
    LD_LIBRARY_PATH="/usr/local/cuda/lib64:${LD_LIBRARY_PATH}" \
    REGRAPH_GPU_MODE=nvidia \
    REGRAPH_MODEL_CACHE=/data/models

RUN apt-get update && apt-get install -y --no-install-recommends \
        python3.11 \
        python3.11-dev \
        python3-pip \
        python3.11-venv \
        build-essential \
        cmake \
        ninja-build \
        git \
        curl \
        ca-certificates \
        procps \
        nvidia-utils-525 \
    && rm -rf /var/lib/apt/lists/*

# Make python3.11 the default
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1 && \
    update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1 && \
    python -m pip install --upgrade pip

WORKDIR /app
COPY pyproject.toml ./
COPY src/ ./src/

# Install PyTorch with CUDA 12.1
RUN pip install --no-cache-dir \
    torch>=2.2.0 \
    --index-url https://download.pytorch.org/whl/cu121

# Install llama-cpp-python with CUDA support
RUN CMAKE_ARGS="-DLLAMA_CUDA=on -DCUDA_TOOLKIT_ROOT_DIR=/usr/local/cuda" \
    FORCE_CMAKE=1 \
    pip install --no-cache-dir llama-cpp-python>=0.2.90

# Install vLLM (pre-built wheel for CUDA 12.1)
RUN pip install --no-cache-dir vllm>=0.4.0 || \
    echo "vLLM install failed (may need matching CUDA wheel) — skipping"

# Install remaining nvidia extras (skip torch/llama-cpp already installed)
RUN pip install --no-cache-dir \
    transformers>=4.40.0 \
    accelerate>=0.30.0 \
    bitsandbytes>=0.43.0 \
    sentence-transformers>=3.0.0 \
    huggingface-hub>=0.22.0 \
    GPUtil>=1.4 \
    httpx>=0.27 \
    pyyaml>=6.0 \
    psutil>=5.9 \
    click>=8.1 \
    pydantic>=2.0 \
    rich>=13.0

# Install agent package
RUN pip install --no-cache-dir -e .

RUN useradd -m -u 1000 agent && \
    mkdir -p /data/models /home/agent/.regraph && \
    chown -R agent:agent /data /home/agent /app

USER agent

VOLUME ["/data/models", "/home/agent/.regraph"]
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD regraph-agent status || exit 1

ENTRYPOINT ["regraph-agent"]
CMD ["run"]



# ── Huawei Ascend NPU (CANN 8.x / Atlas 300 / Atlas 800) ─────────────────────
#
# Prerequisites on the host:
#   1. Ascend Driver ≥ 24.1  (run-compatible kernel module)
#   2. ascend-docker-runtime  (exposes /dev/davinci* and NPU libs into container)
#      https://gitee.com/ascend/ascend-docker-runtime
#
# Build:
#   docker build --target ascend -t regraph-agent:ascend .
#
# Run (single NPU 0):
#   docker run --rm \
#     --device /dev/davinci0 \
#     --device /dev/davinci_manager \
#     --device /dev/hisi_hdc \
#     -v /usr/local/Ascend/driver:/usr/local/Ascend/driver:ro \
#     -v /usr/local/Ascend/firmware:/usr/local/Ascend/firmware:ro \
#     -v /usr/local/sbin/npu-smi:/usr/local/sbin/npu-smi:ro \
#     -e ASCEND_DEVICE_ID=0 \
#     -e REGRAPH_CONNECTION_KEY=rg_conn_xxx \
#     regraph-agent:ascend
#
# Or use the ascend-docker-runtime plugin which handles all mounts automatically:
#   docker run --runtime=ascend -e ASCEND_VISIBLE_DEVICES=0 \
#              -e REGRAPH_CONNECTION_KEY=rg_conn_xxx regraph-agent:ascend
# ─────────────────────────────────────────────────────────────────────────────
FROM ubuntu:22.04 AS ascend

ARG CANN_VERSION=8.0.RC3
ARG PYTHON_VERSION=3.11
ARG VERSION=dev

# ── Base env ──────────────────────────────────────────────────────────────────
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DEBIAN_FRONTEND=noninteractive \
    # Point to host-mounted CANN driver libs (volume-mounted at runtime)
    LD_LIBRARY_PATH="/usr/local/Ascend/driver/lib64:/usr/local/Ascend/driver/lib64/common:/usr/local/Ascend/driver/lib64/driver:${LD_LIBRARY_PATH}" \
    # CANN toolkit root (installed via pip wheels below)
    ASCEND_HOME_PATH=/usr/local/Ascend \
    ASCEND_DEVICE_ID=0 \
    REGRAPH_GPU_MODE=ascend \
    REGRAPH_MODEL_CACHE=/data/models

# ── System packages ───────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        software-properties-common \
        python${PYTHON_VERSION} \
        python${PYTHON_VERSION}-dev \
        python${PYTHON_VERSION}-venv \
        python3-pip \
        build-essential \
        cmake \
        ninja-build \
        git \
        curl \
        ca-certificates \
        wget \
        procps \
        pciutils \
        # Required for Ascend runtime library linking
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Make python3.11 the default
RUN update-alternatives --install /usr/bin/python  python  /usr/bin/python${PYTHON_VERSION} 1 && \
    update-alternatives --install /usr/bin/python3 python3 /usr/bin/python${PYTHON_VERSION} 1 && \
    python -m pip install --upgrade pip

# ── CANN toolkit (Python wheel distribution) ──────────────────────────────────
# Huawei publishes CANN as pip-installable wheels on PyPI (mindspore channel)
# and via the official Ascend community: https://www.hiascend.com/developer/download
#
# The wheels provide: acl, op_proto, atb, hccl, ascend_speed libraries
# and the npu-smi CLI is expected to be volume-mounted from the host driver package.
#
# We install the official torch_npu wheel which bundles CANN runtime stubs
# for CPU-side build, with real CANN libs injected at runtime via volume mounts.
RUN pip install --no-cache-dir \
    # PyTorch (CPU wheels — GPU ops activated via torch_npu at runtime)
    "torch==2.1.0+cpu" \
    --index-url https://download.pytorch.org/whl/cpu

# torch_npu: Huawei's official PyTorch NPU extension
# Wheel index: https://repo.huaweicloud.com/repository/pypi/simple/torch-npu/
# Pin to the version matching torch 2.1.0 on CANN 8.x
RUN pip install --no-cache-dir \
    "torch_npu==2.1.0.post8" \
    --index-url https://repo.huaweicloud.com/repository/pypi/simple/

# ── ML dependencies ───────────────────────────────────────────────────────────
RUN pip install --no-cache-dir \
    "transformers>=4.40.0" \
    "accelerate>=0.30.0" \
    "sentence-transformers>=3.0.0" \
    "huggingface-hub>=0.22.0" \
    "httpx>=0.27" \
    "pyyaml>=6.0" \
    "psutil>=5.9" \
    "click>=8.1" \
    "pydantic>=2.0" \
    "rich>=13.0"

WORKDIR /app
COPY pyproject.toml README.md ./
COPY src/ ./src/

# Install agent package (without heavy extras — already installed above)
RUN pip install --no-cache-dir -e .

# ── Non-root user ─────────────────────────────────────────────────────────────
RUN useradd -m -u 1000 agent && \
    mkdir -p /data/models /home/agent/.regraph && \
    # Grant access to /dev/davinci* nodes (group video is conventional)
    usermod -aG video agent && \
    chown -R agent:agent /data /home/agent /app

USER agent

VOLUME ["/data/models", "/home/agent/.regraph"]
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=15s --start-period=45s --retries=3 \
    CMD regraph-agent status || exit 1

LABEL org.opencontainers.image.title="ReGraph Agent (Ascend NPU)" \
      org.opencontainers.image.description="ReGraph Provider Agent with Huawei Ascend NPU support via CANN + torch_npu" \
      org.regraph.agent.backend="ascend" \
      org.regraph.agent.cann-version="${CANN_VERSION}" \
      org.regraph.agent.version="${VERSION}"

ENTRYPOINT ["regraph-agent"]
CMD ["run"]


# ── macOS Metal / Apple Silicon hint ─────────────────────────────────────────
# Docker Desktop on macOS does NOT expose Metal/MPS to containers.
# This target builds a CPU image with Metal-aware llama.cpp when built
# natively on macOS via: docker buildx build --target metal .
# For full Metal acceleration, run the agent directly (not in Docker):
#   pip install "regraph-agent[metal]"
#   regraph-agent start --key rg_conn_xxx
FROM base AS metal

ENV REGRAPH_GPU_MODE=disabled
# Note: Metal GPU acceleration is not available inside Docker containers.
# The agent will run in CPU mode. For Metal acceleration, install natively.

LABEL org.regraph.agent.note="Metal acceleration requires native installation. See: https://regraph.tech/docs/agent#metal"


# ── Development image ─────────────────────────────────────────────────────────
FROM base AS dev

USER root

RUN apt-get update && apt-get install -y --no-install-recommends \
        vim \
        less \
        htop \
        iputils-ping \
        strace \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    pytest>=8.0 \
    pytest-asyncio \
    pytest-cov \
    ruff \
    mypy \
    ipython

USER agent

ENV REGRAPH_API_URL=http://host.docker.internal:8000
CMD ["bash"]
