#!/bin/bash
# ReGraph Provider Agent Installer
# https://regraph.tech
#
# Usage:
#   curl -fsSL https://regraph.tech/scripts/install.sh | bash
#   curl -fsSL https://regraph.tech/scripts/install.sh | bash -s -- --key YOUR_KEY
#   curl -fsSL https://regraph.tech/scripts/install.sh | bash -s -- --ascend   # force Ascend NPU

set -euo pipefail

REGRAPH_VERSION="1.2.0"
REGRAPH_REPO="https://github.com/regraph-tech/agent.git"
REGRAPH_DIR="$HOME/.regraph"
REGRAPH_VENV="$REGRAPH_DIR/venv"
REGRAPH_SRC="$REGRAPH_DIR/src"
REGRAPH_CONFIG="$REGRAPH_DIR/config.yaml"
REGRAPH_LOG="$REGRAPH_DIR/logs"
CONNECTION_KEY=""
GPU_MODE="auto"
INSTALL_SERVICE=true
FORCE_ASCEND=false

# ─── Colors ───────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
BOLD='\033[1m'
NC='\033[0m'

print_banner() {
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║       ${BOLD}ReGraph Provider Agent Installer${NC}${CYAN}          ║${NC}"
  echo -e "${CYAN}║              Version ${REGRAPH_VERSION}                     ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
  echo ""
}

log_info()  { echo -e "  ${GRAY}→${NC} $1"; }
log_ok()    { echo -e "  ${GREEN}✓${NC} $1"; }
log_warn()  { echo -e "  ${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "  ${RED}✗${NC} $1"; }

# ─── Parse arguments ──────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --key)       CONNECTION_KEY="$2"; shift 2 ;;
    --key=*)     CONNECTION_KEY="${1#*=}"; shift ;;
    --gpu)       GPU_MODE="enabled"; shift ;;
    --cpu-only)  GPU_MODE="disabled"; shift ;;
    --ascend)    FORCE_ASCEND=true; GPU_MODE="ascend"; shift ;;
    --no-service) INSTALL_SERVICE=false; shift ;;
    --help|-h)
      echo "Usage: install.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --key <KEY>       Connection key from your ReGraph dashboard"
      echo "  --gpu             Force enable GPU compute"
      echo "  --cpu-only        Disable GPU, use CPU only"
      echo "  --ascend          Force Huawei Ascend NPU mode"
      echo "  --no-service      Skip systemd/launchd service install"
      echo "  --help            Show this message"
      exit 0
      ;;
    *) log_error "Unknown option: $1"; exit 1 ;;
  esac
done

# ─── Detect platform ─────────────────────────────────────
detect_platform() {
  OS=$(uname -s | tr '[:upper:]' '[:lower:]')
  ARCH=$(uname -m)
  log_info "Platform: ${BOLD}${OS}/${ARCH}${NC}"
}

# ─── Check Python ─────────────────────────────────────────
check_python() {
  local py=""

  for cmd in python3.12 python3.11 python3.10 python3 python; do
    if command -v "$cmd" &>/dev/null; then
      local ver
      ver=$("$cmd" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null || echo "0.0")
      local major minor
      major=$(echo "$ver" | cut -d. -f1)
      minor=$(echo "$ver" | cut -d. -f2)
      if [ "$major" -ge 3 ] && [ "$minor" -ge 10 ]; then
        py="$cmd"
        break
      fi
    fi
  done

  if [ -z "$py" ]; then
    log_error "Python 3.10+ is required but not found."
    echo ""
    echo "  Install Python:"
    if [ "$OS" = "linux" ]; then
      echo "    Ubuntu/Debian:  sudo apt install python3 python3-venv python3-pip"
      echo "    Fedora/RHEL:    sudo dnf install python3 python3-pip"
      echo "    Arch:           sudo pacman -S python python-pip"
    elif [ "$OS" = "darwin" ]; then
      echo "    brew install python@3.12"
    fi
    echo ""
    exit 1
  fi

  PYTHON="$py"
  local full_ver
  full_ver=$("$PYTHON" --version 2>&1)
  log_ok "Python found: ${BOLD}${full_ver}${NC} ($(which $PYTHON))"
}

# ─── Check Git ────────────────────────────────────────────
check_git() {
  if ! command -v git &>/dev/null; then
    log_error "Git is required but not found."
    echo ""
    echo "  Install Git:"
    if [ "$OS" = "linux" ]; then
      echo "    sudo apt install git"
    elif [ "$OS" = "darwin" ]; then
      echo "    xcode-select --install"
    fi
    echo ""
    exit 1
  fi
  log_ok "Git found: $(git --version)"
}

# ─── Detect Ascend NPU ───────────────────────────────────
# Returns 0 (true) if any Ascend hardware evidence is found.
_detect_ascend_hardware() {
  # 1. npu-smi CLI (CANN toolkit)
  if command -v npu-smi &>/dev/null; then
    return 0
  fi
  # 2. ascend-dmi CLI (older CANN distributions)
  if command -v ascend-dmi &>/dev/null; then
    return 0
  fi
  # 3. /dev/davinci* device nodes (Atlas inference cards)
  if ls /dev/davinci[0-9]* &>/dev/null 2>&1; then
    return 0
  fi
  # 4. /dev/davinci_manager (present when CANN driver is loaded)
  if [ -c /dev/davinci_manager ]; then
    return 0
  fi
  # 5. torch_npu importable (already installed by user)
  if "$PYTHON" -c "import torch_npu" &>/dev/null 2>&1; then
    return 0
  fi
  return 1
}

# Check CANN driver version (requires npu-smi on PATH)
_check_cann_version() {
  if command -v npu-smi &>/dev/null; then
    local ver
    ver=$(npu-smi info 2>/dev/null | grep -i "driver version" | head -1 | awk -F: '{print $2}' | xargs)
    if [ -n "$ver" ]; then
      log_info "CANN driver version: ${BOLD}${ver}${NC}"
      # Warn if driver is too old (< 23.0 heuristic: first two digits < 23)
      local major_ver
      major_ver=$(echo "$ver" | cut -d. -f1)
      if [ -n "$major_ver" ] && [ "$major_ver" -lt 23 ] 2>/dev/null; then
        log_warn "CANN driver ${ver} may be outdated. torch_npu 2.1.x requires driver ≥ 23.0"
        log_warn "Upgrade: https://www.hiascend.com/hardware/firmware-drivers"
      fi
    fi

    # Report detected NPU devices
    local npu_count
    npu_count=$(npu-smi info 2>/dev/null | grep -c "NPU ID" || echo "0")
    if [ "$npu_count" -gt 0 ]; then
      log_ok "Ascend NPU devices found: ${BOLD}${npu_count}${NC}"
    fi
  elif ls /dev/davinci[0-9]* &>/dev/null 2>&1; then
    local dev_count
    dev_count=$(ls /dev/davinci[0-9]* 2>/dev/null | wc -l | xargs)
    log_ok "Ascend /dev/davinci* device nodes: ${BOLD}${dev_count}${NC}"
    log_warn "npu-smi not found — install CANN toolkit for full hardware stats"
    log_info "CANN download: ${CYAN}https://www.hiascend.com/developer/download${NC}"
  fi
}

# ─── Detect GPU ───────────────────────────────────────────
detect_gpu() {
  if [ "$GPU_MODE" = "disabled" ]; then
    log_info "GPU: ${YELLOW}disabled${NC} (--cpu-only)"
    return
  fi

  # --ascend flag overrides auto-detection
  if [ "$FORCE_ASCEND" = true ]; then
    log_info "Ascend NPU mode forced via --ascend flag"
    GPU_MODE="ascend"
    _check_cann_version
    return
  fi

  local gpu_found=false

  # NVIDIA (highest priority when both NVIDIA + Ascend present)
  if command -v nvidia-smi &>/dev/null; then
    gpu_found=true
    local gpu_name gpu_mem gpu_count
    gpu_name=$(nvidia-smi --query-gpu=name --format=csv,noheader,nounits 2>/dev/null | head -1 | xargs)
    gpu_mem=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>/dev/null | head -1 | xargs)
    gpu_count=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | wc -l | xargs)
    log_ok "GPU: ${BOLD}NVIDIA ${gpu_name}${NC} (${gpu_mem} MiB VRAM) × ${gpu_count}"
    GPU_MODE="nvidia"
  fi

  # Apple Silicon
  if [ "$OS" = "darwin" ] && [ "$ARCH" = "arm64" ]; then
    gpu_found=true
    local chip
    chip=$(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo "Apple Silicon")
    log_ok "GPU: ${BOLD}${chip}${NC} (Metal / ANE)"
    GPU_MODE="metal"
  fi

  # ROCm
  if command -v rocm-smi &>/dev/null; then
    gpu_found=true
    log_ok "GPU: AMD (ROCm detected)"
    GPU_MODE="rocm"
  fi

  # Huawei Ascend NPU — detected last so NVIDIA takes priority when both are present
  if [ "$gpu_found" = false ] && _detect_ascend_hardware; then
    gpu_found=true
    log_ok "GPU: ${BOLD}Huawei Ascend NPU${NC} (CANN)"
    GPU_MODE="ascend"
    _check_cann_version
  fi

  if [ "$gpu_found" = false ]; then
    GPU_MODE="disabled"
    log_warn "No GPU detected — running in CPU-only mode"
  fi
}

# ─── Clone / update source ───────────────────────────────
install_source() {
  mkdir -p "$REGRAPH_DIR" "$REGRAPH_LOG"

  if [ -d "$REGRAPH_SRC/.git" ]; then
    log_info "Updating agent source..."
    cd "$REGRAPH_SRC"
    git fetch --quiet origin
    git reset --hard "origin/main" --quiet
    cd - >/dev/null
    log_ok "Agent source updated"
  else
    log_info "Cloning agent from GitHub..."
    rm -rf "$REGRAPH_SRC"
    git clone --depth 1 "$REGRAPH_REPO" "$REGRAPH_SRC" 2>&1 | tail -1
    log_ok "Agent source cloned"
  fi
}

# ─── Create venv & install ───────────────────────────────
install_agent() {
  if [ ! -d "$REGRAPH_VENV" ]; then
    log_info "Creating Python virtual environment..."
    "$PYTHON" -m venv "$REGRAPH_VENV"
    log_ok "Virtual environment created"
  fi

  local pip="$REGRAPH_VENV/bin/pip"

  log_info "Installing agent and dependencies..."
  "$pip" install --upgrade pip setuptools wheel --quiet 2>/dev/null
  "$pip" install -e "$REGRAPH_SRC" --quiet 2>/dev/null

  # Install GPU extras
  if [ "$GPU_MODE" = "nvidia" ]; then
    log_info "Installing NVIDIA GPU support..."
    "$pip" install GPUtil --quiet 2>/dev/null
    # Try to install llama-cpp-python with CUDA support
    "$pip" install llama-cpp-python \
      --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu121 \
      --quiet 2>/dev/null || \
      log_warn "llama-cpp-python CUDA install failed — will use CPU fallback"

  elif [ "$GPU_MODE" = "metal" ]; then
    log_info "Installing Metal GPU support..."
    "$pip" install llama-cpp-python --quiet 2>/dev/null || \
      log_warn "llama-cpp-python install failed — will use stub runtime"

  elif [ "$GPU_MODE" = "ascend" ]; then
    _install_ascend_support "$pip"
  fi

  local agent_ver
  agent_ver=$("$REGRAPH_VENV/bin/regraph-agent" --version 2>/dev/null || echo "unknown")
  log_ok "Agent installed: ${BOLD}${agent_ver}${NC}"
}

# ─── Ascend NPU pip install ───────────────────────────────
_install_ascend_support() {
  local pip="$1"

  echo ""
  echo -e "  ${CYAN}┌─ Huawei Ascend NPU Setup ──────────────────────────────┐${NC}"
  echo -e "  ${CYAN}│${NC}  Installing torch_npu + transformers for CANN 8.x       ${CYAN}│${NC}"
  echo -e "  ${CYAN}└────────────────────────────────────────────────────────┘${NC}"
  echo ""

  # CANN prerequisites check ────────────────────────────────
  log_info "Checking CANN prerequisites..."

  local cann_ok=true

  # 1. Driver device nodes must be present (or npu-smi)
  if ! _detect_ascend_hardware; then
    log_warn "No Ascend hardware detected at install time."
    log_warn "torch_npu will be installed but NPU ops will only work with CANN driver loaded."
    cann_ok=false
  fi

  # 2. Warn if /usr/local/Ascend/driver is not present (runtime libs)
  if [ ! -d /usr/local/Ascend/driver ] && [ ! -d /usr/local/Ascend/firmware ]; then
    log_warn "CANN driver libs not found at /usr/local/Ascend/driver"
    log_warn "Install the Ascend driver package before running the agent:"
    log_info "  https://www.hiascend.com/hardware/firmware-drivers"
    cann_ok=false
  else
    log_ok "CANN driver libs found at /usr/local/Ascend/driver"
  fi

  # 3. Check glibc version — torch_npu requires ≥ 2.17
  local glibc_ver
  glibc_ver=$(ldd --version 2>/dev/null | head -1 | grep -oE '[0-9]+\.[0-9]+' | head -1 || echo "0.0")
  local glibc_major glibc_minor
  glibc_major=$(echo "$glibc_ver" | cut -d. -f1)
  glibc_minor=$(echo "$glibc_ver" | cut -d. -f2)
  if [ "${glibc_major:-0}" -lt 2 ] || { [ "${glibc_major:-0}" -eq 2 ] && [ "${glibc_minor:-0}" -lt 17 ]; }; then
    log_warn "glibc ${glibc_ver} detected — torch_npu requires glibc ≥ 2.17 (Ubuntu 18.04+)"
  else
    log_ok "glibc ${glibc_ver} ✓"
  fi

  # torch (CPU wheel — torch_npu brings its own CANN ops at runtime) ──────────
  log_info "Installing PyTorch 2.1 (CPU base for torch_npu)..."
  "$pip" install "torch==2.1.0" \
    --index-url https://download.pytorch.org/whl/cpu \
    --quiet 2>/dev/null || {
      log_warn "PyTorch CPU install failed — trying default index"
      "$pip" install "torch>=2.1.0,<2.2" --quiet 2>/dev/null
    }

  # torch_npu ─────────────────────────────────────────────────────────────────
  # Official Huawei wheel index: https://repo.huaweicloud.com/repository/pypi/simple/
  # Fallback: PyPI (wheels may lag by a release)
  log_info "Installing torch_npu 2.1.0 from Huawei index..."
  if "$pip" install "torch_npu==2.1.0.post8" \
      --index-url https://repo.huaweicloud.com/repository/pypi/simple/ \
      --quiet 2>/dev/null; then
    log_ok "torch_npu installed from Huawei index"
  else
    log_warn "Huawei index unavailable — trying PyPI fallback..."
    if "$pip" install "torch_npu>=2.1.0,<2.2" --quiet 2>/dev/null; then
      log_ok "torch_npu installed from PyPI"
    else
      log_warn "torch_npu install failed — Ascend NPU ops will not be available"
      log_warn "Manual install: pip install torch_npu --index-url https://repo.huaweicloud.com/repository/pypi/simple/"
      return
    fi
  fi

  # ML stack ──────────────────────────────────────────────────────────────────
  log_info "Installing transformers / accelerate / sentence-transformers..."
  "$pip" install \
    "transformers>=4.40.0" \
    "accelerate>=0.30.0" \
    "sentence-transformers>=3.0.0" \
    "huggingface-hub>=0.22.0" \
    --quiet 2>/dev/null || log_warn "Some ML dependencies failed to install"

  # Verify torch_npu import ───────────────────────────────────────────────────
  echo ""
  log_info "Verifying torch_npu import..."
  if "$REGRAPH_VENV/bin/python" -c "
import torch
import torch_npu
count = torch_npu.npu.device_count()
print(f'torch_npu OK — NPU device count: {count}')
" 2>/dev/null; then
    log_ok "torch_npu import successful"
  else
    log_warn "torch_npu imported but NPU devices not visible (expected without CANN driver)"
    log_warn "This is normal if installing without hardware — agent will use NPU at runtime"
  fi

  echo ""
  if [ "$cann_ok" = true ]; then
    log_ok "Ascend NPU setup complete"
  else
    log_warn "Ascend NPU installed with warnings — review above messages before starting the agent"
  fi

  # Print quick-start hints ───────────────────────────────────────────────────
  echo ""
  echo -e "  ${CYAN}Ascend quick-start:${NC}"
  echo -e "    ${BOLD}ASCEND_DEVICE_ID=0 regraph-agent start --key YOUR_KEY${NC}"
  echo ""
  echo -e "  ${CYAN}Multi-NPU (devices 0+1):${NC}"
  echo -e "    ${BOLD}ASCEND_VISIBLE_DEVICES=0,1 regraph-agent start --key YOUR_KEY${NC}"
  echo ""
  echo -e "  ${CYAN}Useful commands:${NC}"
  echo -e "    npu-smi info                    # Hardware stats"
  echo -e "    npu-smi info -t usages-info     # Real-time utilization"
  echo ""
}

# ─── Write config ─────────────────────────────────────────
write_config() {
  if [ -f "$REGRAPH_CONFIG" ]; then
    log_warn "Config exists at $REGRAPH_CONFIG — preserving"
    return
  fi

  cat > "$REGRAPH_CONFIG" <<EOF
# ReGraph Provider Agent Configuration
# https://regraph.tech/docs

network:
  api_url: "https://api.regraph.tech"
  connection_key: "${CONNECTION_KEY}"

compute:
  gpu_mode: "${GPU_MODE}"
  max_memory_percent: 80
  max_cpu_percent: 90
  idle_only: false

logging:
  level: "info"
  directory: "${REGRAPH_LOG}"
  max_size_mb: 100

provider:
  auto_update: true
  heartbeat_interval_sec: 30
  task_timeout_sec: 300
EOF

  log_ok "Config written to $REGRAPH_CONFIG"
}

# ─── Shell integration ───────────────────────────────────
configure_shell() {
  local shell_config=""

  if [ -n "${ZSH_VERSION:-}" ] || [ -f "$HOME/.zshrc" ]; then
    shell_config="$HOME/.zshrc"
  elif [ -f "$HOME/.bashrc" ]; then
    shell_config="$HOME/.bashrc"
  elif [ -f "$HOME/.bash_profile" ]; then
    shell_config="$HOME/.bash_profile"
  fi

  if [ -n "$shell_config" ]; then
    if ! grep -q "REGRAPH" "$shell_config" 2>/dev/null; then
      {
        echo ""
        echo "# ReGraph Agent"
        echo "export REGRAPH_DIR=\"$REGRAPH_DIR\""
        echo "export PATH=\"\$PATH:$REGRAPH_VENV/bin\""
        # For Ascend: also export LD_LIBRARY_PATH if CANN libs are present
        if [ "$GPU_MODE" = "ascend" ] && [ -d /usr/local/Ascend/driver/lib64 ]; then
          echo "export LD_LIBRARY_PATH=\"/usr/local/Ascend/driver/lib64:\$LD_LIBRARY_PATH\""
        fi
      } >> "$shell_config"
      log_ok "Added to PATH in $shell_config"
    fi
  fi

  export PATH="$PATH:$REGRAPH_VENV/bin"

  # Set LD_LIBRARY_PATH for Ascend in current shell session too
  if [ "$GPU_MODE" = "ascend" ] && [ -d /usr/local/Ascend/driver/lib64 ]; then
    export LD_LIBRARY_PATH="/usr/local/Ascend/driver/lib64:${LD_LIBRARY_PATH:-}"
    log_ok "LD_LIBRARY_PATH set for CANN driver libs"
  fi
}

# ─── Systemd service (Linux) ─────────────────────────────
install_systemd_service() {
  if [ "$INSTALL_SERVICE" = false ] || [ "$OS" != "linux" ]; then
    return
  fi

  if ! command -v systemctl &>/dev/null; then
    return
  fi

  local service_dir="$HOME/.config/systemd/user"
  local service_file="$service_dir/regraph-agent.service"
  mkdir -p "$service_dir"

  # Build optional Ascend environment lines
  local ascend_env=""
  if [ "$GPU_MODE" = "ascend" ]; then
    ascend_env="Environment=ASCEND_DEVICE_ID=${ASCEND_DEVICE_ID:-0}
Environment=ASCEND_VISIBLE_DEVICES=${ASCEND_VISIBLE_DEVICES:-0}"
    if [ -d /usr/local/Ascend/driver/lib64 ]; then
      ascend_env="${ascend_env}
Environment=LD_LIBRARY_PATH=/usr/local/Ascend/driver/lib64"
    fi
  fi

  cat > "$service_file" <<EOF
[Unit]
Description=ReGraph Provider Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${REGRAPH_VENV}/bin/regraph-agent run --config ${REGRAPH_CONFIG}
Restart=on-failure
RestartSec=10
Environment=HOME=${HOME}
WorkingDirectory=${REGRAPH_DIR}
${ascend_env}

[Install]
WantedBy=default.target
EOF

  systemctl --user daemon-reload 2>/dev/null || true
  systemctl --user enable regraph-agent.service 2>/dev/null || true

  log_ok "Systemd service installed"
  log_info "Start: ${BOLD}systemctl --user start regraph-agent${NC}"
  log_info "Logs:  ${BOLD}journalctl --user -u regraph-agent -f${NC}"
}

# ─── LaunchAgent (macOS) ──────────────────────────────────
install_launchd() {
  if [ "$INSTALL_SERVICE" = false ] || [ "$OS" != "darwin" ]; then
    return
  fi

  local plist="$HOME/Library/LaunchAgents/tech.regraph.agent.plist"
  mkdir -p "$(dirname "$plist")"

  cat > "$plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>tech.regraph.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>${REGRAPH_VENV}/bin/regraph-agent</string>
        <string>run</string>
        <string>--config</string>
        <string>${REGRAPH_CONFIG}</string>
    </array>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>
    <key>StandardOutPath</key><string>${REGRAPH_LOG}/agent.log</string>
    <key>StandardErrorPath</key><string>${REGRAPH_LOG}/agent.err.log</string>
</dict>
</plist>
EOF

  log_ok "LaunchAgent installed"
  log_info "Start: ${BOLD}launchctl load $plist${NC}"
}

# ─── Summary ──────────────────────────────────────────────
print_summary() {
  echo ""
  echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  Installation complete!${NC}"
  echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
  echo ""
  echo -e "  ${BOLD}Agent:${NC}   $REGRAPH_VENV/bin/regraph-agent"
  echo -e "  ${BOLD}Source:${NC}  $REGRAPH_SRC"
  echo -e "  ${BOLD}Config:${NC}  $REGRAPH_CONFIG"
  echo -e "  ${BOLD}Logs:${NC}    $REGRAPH_LOG"
  echo -e "  ${BOLD}GPU:${NC}     $GPU_MODE"
  echo ""

  if [ -z "$CONNECTION_KEY" ]; then
    echo -e "  ${YELLOW}⚠ No connection key provided.${NC}"
    echo -e "  Get your key: ${CYAN}https://regraph.tech/dashboard${NC}"
    echo ""
    echo -e "  Then run:"
    if [ "$GPU_MODE" = "ascend" ]; then
      echo -e "    ${BOLD}ASCEND_DEVICE_ID=0 regraph-agent start --key YOUR_CONNECTION_KEY${NC}"
    else
      echo -e "    ${BOLD}regraph-agent start --key YOUR_CONNECTION_KEY${NC}"
    fi
  else
    echo -e "  Start the agent:"
    if [ "$OS" = "linux" ] && [ "$INSTALL_SERVICE" = true ] && command -v systemctl &>/dev/null; then
      echo -e "    ${BOLD}systemctl --user start regraph-agent${NC}"
    elif [ "$OS" = "darwin" ] && [ "$INSTALL_SERVICE" = true ]; then
      echo -e "    ${BOLD}launchctl load ~/Library/LaunchAgents/tech.regraph.agent.plist${NC}"
    elif [ "$GPU_MODE" = "ascend" ]; then
      echo -e "    ${BOLD}ASCEND_DEVICE_ID=0 regraph-agent start --key $CONNECTION_KEY${NC}"
    else
      echo -e "    ${BOLD}regraph-agent start --key $CONNECTION_KEY${NC}"
    fi
  fi

  echo ""
  echo -e "  Docs:      ${CYAN}https://regraph.tech/docs${NC}"
  echo -e "  Dashboard: ${CYAN}https://regraph.tech/dashboard${NC}"
  echo -e "  Support:   ${CYAN}https://regraph.tech/support${NC}"
  echo ""
}

# ─── Main ─────────────────────────────────────────────────
main() {
  print_banner
  detect_platform
  check_python
  check_git
  detect_gpu
  install_source
  install_agent
  write_config
  configure_shell
  install_systemd_service
  install_launchd
  print_summary
}

main

REGRAPH_VERSION="1.2.0"
REGRAPH_REPO="https://github.com/regraph-tech/agent.git"
REGRAPH_DIR="$HOME/.regraph"
REGRAPH_VENV="$REGRAPH_DIR/venv"
REGRAPH_SRC="$REGRAPH_DIR/src"
REGRAPH_CONFIG="$REGRAPH_DIR/config.yaml"
REGRAPH_LOG="$REGRAPH_DIR/logs"
CONNECTION_KEY=""
GPU_MODE="auto"
INSTALL_SERVICE=true

# ─── Colors ───────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
BOLD='\033[1m'
NC='\033[0m'

print_banner() {
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║       ${BOLD}ReGraph Provider Agent Installer${NC}${CYAN}          ║${NC}"
  echo -e "${CYAN}║              Version ${REGRAPH_VERSION}                     ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
  echo ""
}

log_info()  { echo -e "  ${GRAY}→${NC} $1"; }
log_ok()    { echo -e "  ${GREEN}✓${NC} $1"; }
log_warn()  { echo -e "  ${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "  ${RED}✗${NC} $1"; }

# ─── Parse arguments ──────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --key)       CONNECTION_KEY="$2"; shift 2 ;;
    --key=*)     CONNECTION_KEY="${1#*=}"; shift ;;
    --gpu)       GPU_MODE="enabled"; shift ;;
    --cpu-only)  GPU_MODE="disabled"; shift ;;
    --no-service) INSTALL_SERVICE=false; shift ;;
    --help|-h)
      echo "Usage: install.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --key <KEY>       Connection key from your ReGraph dashboard"
      echo "  --gpu             Force enable GPU compute"
      echo "  --cpu-only        Disable GPU, use CPU only"
      echo "  --no-service      Skip systemd/launchd service install"
      echo "  --help            Show this message"
      exit 0
      ;;
    *) log_error "Unknown option: $1"; exit 1 ;;
  esac
done

# ─── Detect platform ─────────────────────────────────────
detect_platform() {
  OS=$(uname -s | tr '[:upper:]' '[:lower:]')
  ARCH=$(uname -m)
  log_info "Platform: ${BOLD}${OS}/${ARCH}${NC}"
}

# ─── Check Python ─────────────────────────────────────────
check_python() {
  local py=""

  for cmd in python3.12 python3.11 python3.10 python3 python; do
    if command -v "$cmd" &>/dev/null; then
      local ver
      ver=$("$cmd" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null || echo "0.0")
      local major minor
      major=$(echo "$ver" | cut -d. -f1)
      minor=$(echo "$ver" | cut -d. -f2)
      if [ "$major" -ge 3 ] && [ "$minor" -ge 10 ]; then
        py="$cmd"
        break
      fi
    fi
  done

  if [ -z "$py" ]; then
    log_error "Python 3.10+ is required but not found."
    echo ""
    echo "  Install Python:"
    if [ "$OS" = "linux" ]; then
      echo "    Ubuntu/Debian:  sudo apt install python3 python3-venv python3-pip"
      echo "    Fedora/RHEL:    sudo dnf install python3 python3-pip"
      echo "    Arch:           sudo pacman -S python python-pip"
    elif [ "$OS" = "darwin" ]; then
      echo "    brew install python@3.12"
    fi
    echo ""
    exit 1
  fi

  PYTHON="$py"
  local full_ver
  full_ver=$("$PYTHON" --version 2>&1)
  log_ok "Python found: ${BOLD}${full_ver}${NC} ($(which $PYTHON))"
}

# ─── Check Git ────────────────────────────────────────────
check_git() {
  if ! command -v git &>/dev/null; then
    log_error "Git is required but not found."
    echo ""
    echo "  Install Git:"
    if [ "$OS" = "linux" ]; then
      echo "    sudo apt install git"
    elif [ "$OS" = "darwin" ]; then
      echo "    xcode-select --install"
    fi
    echo ""
    exit 1
  fi
  log_ok "Git found: $(git --version)"
}

# ─── Detect GPU ───────────────────────────────────────────
detect_gpu() {
  if [ "$GPU_MODE" = "disabled" ]; then
    log_info "GPU: ${YELLOW}disabled${NC} (--cpu-only)"
    return
  fi

  local gpu_found=false

  # NVIDIA
  if command -v nvidia-smi &>/dev/null; then
    gpu_found=true
    local gpu_name
    gpu_name=$(nvidia-smi --query-gpu=name --format=csv,noheader,nounits 2>/dev/null | head -1 | xargs)
    local gpu_mem
    gpu_mem=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>/dev/null | head -1 | xargs)
    local gpu_count
    gpu_count=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | wc -l | xargs)
    log_ok "GPU: ${BOLD}NVIDIA ${gpu_name}${NC} (${gpu_mem} MiB VRAM) × ${gpu_count}"
    GPU_MODE="nvidia"
  fi

  # Apple Silicon
  if [ "$OS" = "darwin" ] && [ "$ARCH" = "arm64" ]; then
    gpu_found=true
    local chip
    chip=$(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo "Apple Silicon")
    log_ok "GPU: ${BOLD}${chip}${NC} (Metal / ANE)"
    GPU_MODE="metal"
  fi

  # ROCm
  if command -v rocm-smi &>/dev/null; then
    gpu_found=true
    log_ok "GPU: AMD (ROCm detected)"
    GPU_MODE="rocm"
  fi

  if [ "$gpu_found" = false ]; then
    GPU_MODE="disabled"
    log_warn "No GPU detected — running in CPU-only mode"
  fi
}

# ─── Clone / update source ───────────────────────────────
install_source() {
  mkdir -p "$REGRAPH_DIR" "$REGRAPH_LOG"

  if [ -d "$REGRAPH_SRC/.git" ]; then
    log_info "Updating agent source..."
    cd "$REGRAPH_SRC"
    git fetch --quiet origin
    git reset --hard "origin/main" --quiet
    cd - >/dev/null
    log_ok "Agent source updated"
  else
    log_info "Cloning agent from GitHub..."
    rm -rf "$REGRAPH_SRC"
    git clone --depth 1 "$REGRAPH_REPO" "$REGRAPH_SRC" 2>&1 | tail -1
    log_ok "Agent source cloned"
  fi
}

# ─── Create venv & install ───────────────────────────────
install_agent() {
  if [ ! -d "$REGRAPH_VENV" ]; then
    log_info "Creating Python virtual environment..."
    "$PYTHON" -m venv "$REGRAPH_VENV"
    log_ok "Virtual environment created"
  fi

  local pip="$REGRAPH_VENV/bin/pip"
  local pip_python="$REGRAPH_VENV/bin/python"

  log_info "Installing agent and dependencies..."
  "$pip" install --upgrade pip setuptools wheel --quiet 2>/dev/null
  "$pip" install -e "$REGRAPH_SRC" --quiet 2>/dev/null

  # Install GPU extras
  if [ "$GPU_MODE" = "nvidia" ]; then
    log_info "Installing NVIDIA GPU support..."
    "$pip" install GPUtil --quiet 2>/dev/null
    # Try to install llama-cpp-python with CUDA support
    "$pip" install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu121 --quiet 2>/dev/null || \
      log_warn "llama-cpp-python CUDA install failed — will use CPU fallback"
  elif [ "$GPU_MODE" = "metal" ]; then
    log_info "Installing Metal GPU support..."
    "$pip" install llama-cpp-python --quiet 2>/dev/null || \
      log_warn "llama-cpp-python install failed — will use stub runtime"
  fi

  local agent_ver
  agent_ver=$("$REGRAPH_VENV/bin/regraph-agent" --version 2>/dev/null || echo "unknown")
  log_ok "Agent installed: ${BOLD}${agent_ver}${NC}"
}

# ─── Write config ─────────────────────────────────────────
write_config() {
  if [ -f "$REGRAPH_CONFIG" ]; then
    log_warn "Config exists at $REGRAPH_CONFIG — preserving"
    return
  fi

  cat > "$REGRAPH_CONFIG" <<EOF
# ReGraph Provider Agent Configuration
# https://regraph.tech/docs

network:
  api_url: "https://api.regraph.tech"
  connection_key: "${CONNECTION_KEY}"

compute:
  gpu_mode: "${GPU_MODE}"
  max_memory_percent: 80
  max_cpu_percent: 90
  idle_only: false

logging:
  level: "info"
  directory: "${REGRAPH_LOG}"
  max_size_mb: 100

provider:
  auto_update: true
  heartbeat_interval_sec: 30
  task_timeout_sec: 300
EOF

  log_ok "Config written to $REGRAPH_CONFIG"
}

# ─── Shell integration ───────────────────────────────────
configure_shell() {
  local shell_config=""

  if [ -n "${ZSH_VERSION:-}" ] || [ -f "$HOME/.zshrc" ]; then
    shell_config="$HOME/.zshrc"
  elif [ -f "$HOME/.bashrc" ]; then
    shell_config="$HOME/.bashrc"
  elif [ -f "$HOME/.bash_profile" ]; then
    shell_config="$HOME/.bash_profile"
  fi

  if [ -n "$shell_config" ]; then
    if ! grep -q "REGRAPH" "$shell_config" 2>/dev/null; then
      {
        echo ""
        echo "# ReGraph Agent"
        echo "export REGRAPH_DIR=\"$REGRAPH_DIR\""
        echo "export PATH=\"\$PATH:$REGRAPH_VENV/bin\""
      } >> "$shell_config"
      log_ok "Added to PATH in $shell_config"
    fi
  fi

  export PATH="$PATH:$REGRAPH_VENV/bin"
}

# ─── Systemd service (Linux) ─────────────────────────────
install_systemd_service() {
  if [ "$INSTALL_SERVICE" = false ] || [ "$OS" != "linux" ]; then
    return
  fi

  if ! command -v systemctl &>/dev/null; then
    return
  fi

  local service_dir="$HOME/.config/systemd/user"
  local service_file="$service_dir/regraph-agent.service"
  mkdir -p "$service_dir"

  cat > "$service_file" <<EOF
[Unit]
Description=ReGraph Provider Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${REGRAPH_VENV}/bin/regraph-agent run --config ${REGRAPH_CONFIG}
Restart=on-failure
RestartSec=10
Environment=HOME=${HOME}
WorkingDirectory=${REGRAPH_DIR}

[Install]
WantedBy=default.target
EOF

  systemctl --user daemon-reload 2>/dev/null || true
  systemctl --user enable regraph-agent.service 2>/dev/null || true

  log_ok "Systemd service installed"
  log_info "Start: ${BOLD}systemctl --user start regraph-agent${NC}"
  log_info "Logs:  ${BOLD}journalctl --user -u regraph-agent -f${NC}"
}

# ─── LaunchAgent (macOS) ──────────────────────────────────
install_launchd() {
  if [ "$INSTALL_SERVICE" = false ] || [ "$OS" != "darwin" ]; then
    return
  fi

  local plist="$HOME/Library/LaunchAgents/tech.regraph.agent.plist"
  mkdir -p "$(dirname "$plist")"

  cat > "$plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>tech.regraph.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>${REGRAPH_VENV}/bin/regraph-agent</string>
        <string>run</string>
        <string>--config</string>
        <string>${REGRAPH_CONFIG}</string>
    </array>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>
    <key>StandardOutPath</key><string>${REGRAPH_LOG}/agent.log</string>
    <key>StandardErrorPath</key><string>${REGRAPH_LOG}/agent.err.log</string>
</dict>
</plist>
EOF

  log_ok "LaunchAgent installed"
  log_info "Start: ${BOLD}launchctl load $plist${NC}"
}

# ─── Summary ──────────────────────────────────────────────
print_summary() {
  echo ""
  echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  Installation complete!${NC}"
  echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
  echo ""
  echo -e "  ${BOLD}Agent:${NC}   $REGRAPH_VENV/bin/regraph-agent"
  echo -e "  ${BOLD}Source:${NC}  $REGRAPH_SRC"
  echo -e "  ${BOLD}Config:${NC}  $REGRAPH_CONFIG"
  echo -e "  ${BOLD}Logs:${NC}    $REGRAPH_LOG"
  echo -e "  ${BOLD}GPU:${NC}     $GPU_MODE"
  echo ""

  if [ -z "$CONNECTION_KEY" ]; then
    echo -e "  ${YELLOW}⚠ No connection key provided.${NC}"
    echo -e "  Get your key: ${CYAN}https://regraph.tech/dashboard${NC}"
    echo ""
    echo -e "  Then run:"
    echo -e "    ${BOLD}regraph-agent start --key YOUR_CONNECTION_KEY${NC}"
  else
    echo -e "  Start the agent:"
    if [ "$OS" = "linux" ] && [ "$INSTALL_SERVICE" = true ] && command -v systemctl &>/dev/null; then
      echo -e "    ${BOLD}systemctl --user start regraph-agent${NC}"
    elif [ "$OS" = "darwin" ] && [ "$INSTALL_SERVICE" = true ]; then
      echo -e "    ${BOLD}launchctl load ~/Library/LaunchAgents/tech.regraph.agent.plist${NC}"
    else
      echo -e "    ${BOLD}regraph-agent start --key $CONNECTION_KEY${NC}"
    fi
  fi

  echo ""
  echo -e "  Docs:      ${CYAN}https://regraph.tech/docs${NC}"
  echo -e "  Dashboard: ${CYAN}https://regraph.tech/dashboard${NC}"
  echo -e "  Support:   ${CYAN}https://regraph.tech/support${NC}"
  echo ""
}

# ─── Main ─────────────────────────────────────────────────
main() {
  print_banner
  detect_platform
  check_python
  check_git
  detect_gpu
  install_source
  install_agent
  write_config
  configure_shell
  install_systemd_service
  install_launchd
  print_summary
}

main
