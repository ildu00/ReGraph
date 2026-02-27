#!/usr/bin/env bash
# ============================================================
# ReGraph Agent — Smart Docker launcher
# Auto-detects platform and picks the right image/target
#
# Usage:
#   ./run.sh                          # auto-detect
#   ./run.sh --key rg_conn_xxxxx      # with connection key
#   ./run.sh --target nvidia          # force nvidia
#   ./run.sh --target cpu             # force cpu
#   ./run.sh --build                  # rebuild image
# ============================================================
set -euo pipefail

IMAGE_BASE="ghcr.io/regraph-tech/agent"
VERSION="1.2.0"
TARGET=""
CONNECTION_KEY="${REGRAPH_CONNECTION_KEY:-}"
BUILD=false
EXTRA_ARGS=()

# ── Parse args ────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --key)       CONNECTION_KEY="$2"; shift 2 ;;
    --target)    TARGET="$2"; shift 2 ;;
    --build)     BUILD=true; shift ;;
    *)           EXTRA_ARGS+=("$1"); shift ;;
  esac
done

# ── Auto-detect platform ──────────────────────────────────────────────────────
if [[ -z "$TARGET" ]]; then
  if command -v nvidia-smi &>/dev/null && nvidia-smi &>/dev/null; then
    TARGET="nvidia"
    echo "✅  NVIDIA GPU detected → using CUDA image"
  elif [[ "$(uname -s)" == "Darwin" && "$(uname -m)" == "arm64" ]]; then
    TARGET="metal"
    echo "🍎  Apple Silicon detected → Metal not available in Docker"
    echo "    For full Metal acceleration, run natively:"
    echo "    pip install 'regraph-agent[metal]' && regraph-agent start --key \$KEY"
    echo "    Continuing with CPU image …"
    TARGET="cpu"
  else
    TARGET="cpu"
    echo "💻  CPU mode"
  fi
fi

IMAGE="${IMAGE_BASE}:${VERSION}-${TARGET}"

# ── Build if requested or image missing ───────────────────────────────────────
if $BUILD || ! docker image inspect "$IMAGE" &>/dev/null; then
  echo "🔨  Building ${TARGET} image …"
  docker build \
    --target "$TARGET" \
    -t "$IMAGE" \
    -t "${IMAGE_BASE}:latest-${TARGET}" \
    "$(dirname "$0")"
fi

# ── Assemble docker run flags ─────────────────────────────────────────────────
DOCKER_FLAGS=(
  "--rm"
  "--name" "regraph-agent"
  "-v" "regraph-models:/data/models"
  "-v" "regraph-config:/home/agent/.regraph"
  "-e" "REGRAPH_API_URL=${REGRAPH_API_URL:-https://api.regraph.tech}"
)

if [[ -n "$CONNECTION_KEY" ]]; then
  DOCKER_FLAGS+=("-e" "REGRAPH_CONNECTION_KEY=${CONNECTION_KEY}")
fi

if [[ "$TARGET" == "nvidia" ]]; then
  DOCKER_FLAGS+=("--gpus" "all")
  DOCKER_FLAGS+=("-e" "REGRAPH_GPU_MODE=nvidia")
fi

# ── Run ───────────────────────────────────────────────────────────────────────
echo "🚀  Starting regraph-agent (${TARGET}) …"

if [[ -n "$CONNECTION_KEY" ]]; then
  docker run "${DOCKER_FLAGS[@]}" "$IMAGE" \
    start --key "$CONNECTION_KEY" "${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}"
else
  # Try to run from saved config
  docker run "${DOCKER_FLAGS[@]}" "$IMAGE" run "${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}"
fi
