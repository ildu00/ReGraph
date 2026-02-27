# ============================================================
# ReGraph Provider Agent — Multi-stage Dockerfile
#
# Targets:
#   base      — CPU-only (any x86_64 / arm64)
#   nvidia    — CUDA 12.1 + llama.cpp CUDA + vLLM
#   metal     — macOS Apple Silicon hint (CPU image + Metal note)
#   dev       — base + dev tools for local development
#
# Usage:
#   # Auto-detect (see docker-bake.hcl or use BUILDKIT_TARGET)
#   docker build --target cpu   -t regraph-agent:cpu   .
#   docker build --target nvidia -t regraph-agent:nvidia .
#
#   # NVIDIA (requires nvidia-container-toolkit)
#   docker run --gpus all -e REGRAPH_CONNECTION_KEY=rg_conn_xxx regraph-agent:nvidia
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
COPY pyproject.toml README.md ./
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
COPY pyproject.toml README.md ./
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
