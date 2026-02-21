#!/bin/bash
# ReGraph Provider Agent Installer
# https://regraph.tech
#
# Usage:
#   curl -fsSL https://regraph.tech/scripts/install.sh | bash
#   curl -fsSL https://regraph.tech/scripts/install.sh | bash -s -- --key YOUR_KEY

set -euo pipefail

REGRAPH_VERSION="1.2.0"
REGRAPH_API="https://releases.regraph.tech"
REGRAPH_DIR="$HOME/.regraph"
REGRAPH_BIN="$REGRAPH_DIR/bin"
REGRAPH_CONFIG="$REGRAPH_DIR/config.yaml"
REGRAPH_LOG="$REGRAPH_DIR/logs"
AGENT_BIN="$REGRAPH_BIN/regraph-agent"
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

log_info()  { echo -e "${GRAY}→${NC} $1"; }
log_ok()    { echo -e "${GREEN}✓${NC} $1"; }
log_warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

# ─── Parse arguments ──────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --key)       CONNECTION_KEY="$2"; shift 2 ;;
    --key=*)     CONNECTION_KEY="${1#*=}"; shift ;;
    --gpu)       GPU_MODE="enabled"; shift ;;
    --cpu-only)  GPU_MODE="disabled"; shift ;;
    --no-service) INSTALL_SERVICE=false; shift ;;
    --version)   REGRAPH_VERSION="$2"; shift 2 ;;
    --version=*) REGRAPH_VERSION="${1#*=}"; shift ;;
    --help|-h)
      echo "Usage: install.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --key <KEY>       Connection key from your ReGraph dashboard"
      echo "  --gpu             Force enable GPU compute"
      echo "  --cpu-only        Disable GPU, use CPU only"
      echo "  --no-service      Skip systemd service installation"
      echo "  --version <VER>   Install specific version (default: $REGRAPH_VERSION)"
      echo "  --help            Show this message"
      exit 0
      ;;
    *) log_error "Unknown option: $1"; exit 1 ;;
  esac
done

# ─── Detect system ────────────────────────────────────────
detect_platform() {
  OS=$(uname -s | tr '[:upper:]' '[:lower:]')
  ARCH=$(uname -m)

  case "$OS" in
    linux)   OS="linux" ;;
    darwin)  OS="darwin" ;;
    *)       log_error "Unsupported OS: $OS"; exit 1 ;;
  esac

  case "$ARCH" in
    x86_64)  ARCH="amd64" ;;
    aarch64) ARCH="arm64" ;;
    arm64)   ARCH="arm64" ;;
    *)       log_error "Unsupported architecture: $ARCH"; exit 1 ;;
  esac

  log_info "Platform: ${BOLD}$OS/$ARCH${NC}"
}

# ─── Check dependencies ──────────────────────────────────
check_dependencies() {
  local missing=()

  for cmd in curl tar; do
    if ! command -v "$cmd" &>/dev/null; then
      missing+=("$cmd")
    fi
  done

  if [ ${#missing[@]} -gt 0 ]; then
    log_error "Missing required tools: ${missing[*]}"
    log_info "Install them with your package manager and retry."
    exit 1
  fi

  log_ok "Dependencies verified (curl, tar)"
}

# ─── Detect GPU ───────────────────────────────────────────
detect_gpu() {
  if [ "$GPU_MODE" = "disabled" ]; then
    log_info "GPU: ${YELLOW}disabled${NC} (--cpu-only)"
    return
  fi

  local gpu_found=false
  local gpu_info=""

  # NVIDIA
  if command -v nvidia-smi &>/dev/null; then
    gpu_found=true
    local gpu_name
    gpu_name=$(nvidia-smi --query-gpu=name --format=csv,noheader,nounits 2>/dev/null | head -1 | xargs)
    local gpu_mem
    gpu_mem=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>/dev/null | head -1 | xargs)
    local driver_ver
    driver_ver=$(nvidia-smi --query-gpu=driver_version --format=csv,noheader 2>/dev/null | head -1 | xargs)
    local gpu_count
    gpu_count=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | wc -l | xargs)

    gpu_info="NVIDIA $gpu_name (${gpu_mem} MiB VRAM) × $gpu_count — Driver $driver_ver"
    GPU_MODE="nvidia"

    # Check CUDA
    if command -v nvcc &>/dev/null; then
      local cuda_ver
      cuda_ver=$(nvcc --version 2>/dev/null | grep "release" | sed 's/.*release //' | sed 's/,.*//')
      gpu_info="$gpu_info, CUDA $cuda_ver"
    fi
  fi

  # Apple Silicon (macOS)
  if [ "$OS" = "darwin" ] && [ "$ARCH" = "arm64" ]; then
    gpu_found=true
    local chip
    chip=$(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo "Apple Silicon")
    gpu_info="$chip (Metal / Apple Neural Engine)"
    GPU_MODE="metal"
  fi

  # ROCm (AMD)
  if command -v rocm-smi &>/dev/null; then
    gpu_found=true
    gpu_info="AMD GPU (ROCm detected)"
    GPU_MODE="rocm"
  fi

  if [ "$gpu_found" = true ]; then
    log_ok "GPU detected: ${BOLD}$gpu_info${NC}"
  else
    if [ "$GPU_MODE" = "auto" ]; then
      GPU_MODE="disabled"
      log_warn "No GPU detected — running in CPU-only mode"
    else
      log_error "GPU was requested but none found"
      exit 1
    fi
  fi
}

# ─── Download & install ──────────────────────────────────
install_agent() {
  log_info "Creating directories..."
  mkdir -p "$REGRAPH_BIN" "$REGRAPH_LOG"

  local archive="regraph-agent-${OS}-${ARCH}.tar.gz"
  local url="${REGRAPH_API}/agent/v${REGRAPH_VERSION}/${archive}"
  local checksum_url="${url}.sha256"
  local tmp_dir
  tmp_dir=$(mktemp -d)

  log_info "Downloading ReGraph agent v${REGRAPH_VERSION}..."
  log_info "${GRAY}${url}${NC}"

  if ! curl -fSL --progress-bar "$url" -o "$tmp_dir/$archive" 2>&1; then
    log_error "Download failed. Check your internet connection or verify version $REGRAPH_VERSION exists."
    rm -rf "$tmp_dir"
    exit 1
  fi

  # Verify checksum
  log_info "Verifying integrity..."
  if curl -fsSL "$checksum_url" -o "$tmp_dir/$archive.sha256" 2>/dev/null; then
    local expected
    expected=$(cat "$tmp_dir/$archive.sha256" | awk '{print $1}')
    local actual
    if command -v sha256sum &>/dev/null; then
      actual=$(sha256sum "$tmp_dir/$archive" | awk '{print $1}')
    elif command -v shasum &>/dev/null; then
      actual=$(shasum -a 256 "$tmp_dir/$archive" | awk '{print $1}')
    fi

    if [ -n "${actual:-}" ] && [ "$actual" != "$expected" ]; then
      log_error "Checksum verification failed!"
      log_error "Expected: $expected"
      log_error "Actual:   $actual"
      rm -rf "$tmp_dir"
      exit 1
    fi
    log_ok "Checksum verified"
  else
    log_warn "Checksum file not available — skipping verification"
  fi

  # Extract
  log_info "Extracting..."
  tar -xzf "$tmp_dir/$archive" -C "$tmp_dir"

  # Install binary
  if [ -f "$tmp_dir/regraph-agent" ]; then
    mv "$tmp_dir/regraph-agent" "$AGENT_BIN"
  elif [ -f "$tmp_dir/regraph-agent-${OS}-${ARCH}" ]; then
    mv "$tmp_dir/regraph-agent-${OS}-${ARCH}" "$AGENT_BIN"
  else
    log_error "Agent binary not found in archive"
    rm -rf "$tmp_dir"
    exit 1
  fi

  chmod +x "$AGENT_BIN"
  rm -rf "$tmp_dir"

  log_ok "Agent installed to ${BOLD}$AGENT_BIN${NC}"
}

# ─── Write config ─────────────────────────────────────────
write_config() {
  if [ -f "$REGRAPH_CONFIG" ]; then
    log_warn "Config already exists at $REGRAPH_CONFIG — preserving"
    return
  fi

  cat > "$REGRAPH_CONFIG" <<EOF
# ReGraph Provider Agent Configuration
# Documentation: https://regraph.tech/docs

agent:
  version: "${REGRAPH_VERSION}"

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
  rotate: true

provider:
  auto_update: true
  heartbeat_interval_sec: 30
  task_timeout_sec: 300
EOF

  log_ok "Config written to ${BOLD}$REGRAPH_CONFIG${NC}"
}

# ─── Add to PATH ──────────────────────────────────────────
configure_path() {
  local shell_config=""

  if [ -n "${ZSH_VERSION:-}" ] || [ -f "$HOME/.zshrc" ]; then
    shell_config="$HOME/.zshrc"
  elif [ -f "$HOME/.bashrc" ]; then
    shell_config="$HOME/.bashrc"
  elif [ -f "$HOME/.bash_profile" ]; then
    shell_config="$HOME/.bash_profile"
  elif [ -f "$HOME/.profile" ]; then
    shell_config="$HOME/.profile"
  fi

  if [ -n "$shell_config" ]; then
    if ! grep -q "REGRAPH" "$shell_config" 2>/dev/null; then
      {
        echo ""
        echo "# ReGraph Agent"
        echo "export REGRAPH_DIR=\"$REGRAPH_DIR\""
        echo "export PATH=\"\$PATH:$REGRAPH_BIN\""
      } >> "$shell_config"
      log_ok "Added to PATH in $shell_config"
    else
      log_info "PATH already configured"
    fi
  else
    log_warn "Could not detect shell config — add $REGRAPH_BIN to your PATH manually"
  fi

  export PATH="$PATH:$REGRAPH_BIN"
}

# ─── Install systemd service (Linux) ─────────────────────
install_service() {
  if [ "$INSTALL_SERVICE" = false ]; then
    log_info "Service installation skipped (--no-service)"
    return
  fi

  if [ "$OS" != "linux" ]; then
    return
  fi

  if ! command -v systemctl &>/dev/null; then
    log_warn "systemd not found — skipping service install"
    return
  fi

  local service_file="$HOME/.config/systemd/user/regraph-agent.service"
  mkdir -p "$(dirname "$service_file")"

  cat > "$service_file" <<EOF
[Unit]
Description=ReGraph Provider Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${AGENT_BIN} --config ${REGRAPH_CONFIG}
Restart=on-failure
RestartSec=10
Environment=HOME=${HOME}
WorkingDirectory=${REGRAPH_DIR}

# Resource limits
LimitNOFILE=65536
LimitMEMLOCK=infinity

[Install]
WantedBy=default.target
EOF

  systemctl --user daemon-reload 2>/dev/null || true
  systemctl --user enable regraph-agent.service 2>/dev/null || true

  log_ok "Systemd user service installed and enabled"
  log_info "Start with: ${BOLD}systemctl --user start regraph-agent${NC}"
  log_info "View logs:  ${BOLD}journalctl --user -u regraph-agent -f${NC}"
}

# ─── Install launchd plist (macOS) ────────────────────────
install_launchd() {
  if [ "$INSTALL_SERVICE" = false ]; then
    return
  fi

  if [ "$OS" != "darwin" ]; then
    return
  fi

  local plist_file="$HOME/Library/LaunchAgents/tech.regraph.agent.plist"
  mkdir -p "$(dirname "$plist_file")"

  cat > "$plist_file" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>tech.regraph.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>${AGENT_BIN}</string>
        <string>--config</string>
        <string>${REGRAPH_CONFIG}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>
    <key>StandardOutPath</key>
    <string>${REGRAPH_LOG}/agent.log</string>
    <key>StandardErrorPath</key>
    <string>${REGRAPH_LOG}/agent.err.log</string>
    <key>WorkingDirectory</key>
    <string>${REGRAPH_DIR}</string>
</dict>
</plist>
EOF

  log_ok "LaunchAgent installed"
  log_info "Start with: ${BOLD}launchctl load $plist_file${NC}"
  log_info "Stop with:  ${BOLD}launchctl unload $plist_file${NC}"
}

# ─── Verify installation ─────────────────────────────────
verify_install() {
  if [ ! -x "$AGENT_BIN" ]; then
    log_error "Installation verification failed — binary not executable"
    exit 1
  fi

  local agent_version
  agent_version=$("$AGENT_BIN" --version 2>/dev/null || echo "unknown")
  log_ok "Agent binary verified: $agent_version"
}

# ─── Summary ──────────────────────────────────────────────
print_summary() {
  echo ""
  echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  Installation complete!${NC}"
  echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
  echo ""
  echo -e "  ${BOLD}Agent:${NC}   $AGENT_BIN"
  echo -e "  ${BOLD}Config:${NC}  $REGRAPH_CONFIG"
  echo -e "  ${BOLD}Logs:${NC}    $REGRAPH_LOG"
  echo -e "  ${BOLD}GPU:${NC}     $GPU_MODE"
  echo ""

  if [ -z "$CONNECTION_KEY" ]; then
    echo -e "  ${YELLOW}⚠ No connection key provided.${NC}"
    echo -e "  Get your key from: ${CYAN}https://regraph.tech/dashboard${NC}"
    echo ""
    echo -e "  Then start the agent:"
    echo -e "    ${BOLD}regraph-agent --key YOUR_CONNECTION_KEY${NC}"
  else
    echo -e "  Start the agent:"
    if [ "$OS" = "linux" ] && [ "$INSTALL_SERVICE" = true ] && command -v systemctl &>/dev/null; then
      echo -e "    ${BOLD}systemctl --user start regraph-agent${NC}"
    elif [ "$OS" = "darwin" ] && [ "$INSTALL_SERVICE" = true ]; then
      echo -e "    ${BOLD}launchctl load ~/Library/LaunchAgents/tech.regraph.agent.plist${NC}"
    else
      echo -e "    ${BOLD}regraph-agent --config $REGRAPH_CONFIG${NC}"
    fi
  fi

  echo ""
  echo -e "  Documentation:  ${CYAN}https://regraph.tech/docs${NC}"
  echo -e "  Dashboard:      ${CYAN}https://regraph.tech/dashboard${NC}"
  echo -e "  Support:        ${CYAN}https://regraph.tech/support${NC}"
  echo ""
}

# ─── Main ─────────────────────────────────────────────────
main() {
  print_banner
  detect_platform
  check_dependencies
  detect_gpu
  install_agent
  write_config
  configure_path
  install_service
  install_launchd
  verify_install
  print_summary
}

main
