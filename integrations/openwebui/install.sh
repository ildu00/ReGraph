#!/usr/bin/env bash
# =============================================================================
# ReGraph × Open WebUI — Automated Setup Script
# =============================================================================
# Installs Open WebUI pre-configured with ReGraph as the AI provider.
#
# Usage:
#   chmod +x install.sh && ./install.sh
#
# Or non-interactively (CI / headless):
#   REGRAPH_API_KEY=rg_your_key ./install.sh
# =============================================================================

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── Banner ────────────────────────────────────────────────────────────────────
echo -e "${BOLD}"
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║   ReGraph  ×  Open WebUI  —  Setup Script   ║"
echo "  ╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Check dependencies ────────────────────────────────────────────────────────
check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    error "$1 is required but not installed. Install it and re-run this script."
  fi
}

info "Checking dependencies..."
check_cmd docker
check_cmd curl

# Check Docker is running
if ! docker info &>/dev/null 2>&1; then
  error "Docker daemon is not running. Start Docker and re-run."
fi

# Check docker compose (v2 plugin or standalone)
if docker compose version &>/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE="docker-compose"
else
  error "Docker Compose is required. Install it from https://docs.docker.com/compose/install/"
fi

success "Dependencies OK (Docker, Docker Compose)"

# ── API Key ───────────────────────────────────────────────────────────────────
if [[ -z "${REGRAPH_API_KEY:-}" ]]; then
  echo ""
  echo -e "${BOLD}Your ReGraph API Key${NC}"
  echo "  Get it at: https://regraph.tech/dashboard → API Keys"
  echo ""
  read -rsp "  Enter your ReGraph API key (rg_...): " REGRAPH_API_KEY
  echo ""
fi

if [[ -z "$REGRAPH_API_KEY" ]]; then
  error "API key cannot be empty."
fi

if [[ ! "$REGRAPH_API_KEY" == rg_* ]]; then
  warn "Key doesn't start with 'rg_' — double-check you copied the full key."
fi

success "API key accepted"

# ── Port selection ────────────────────────────────────────────────────────────
PORT="${OPENWEBUI_PORT:-3000}"

if lsof -i ":$PORT" &>/dev/null 2>&1 || ss -tlnp "sport = :$PORT" &>/dev/null 2>&1; then
  warn "Port $PORT appears to be in use."
  read -rp "  Enter an alternative port [default: 3001]: " ALT_PORT
  PORT="${ALT_PORT:-3001}"
fi

info "Open WebUI will be available at http://localhost:$PORT"

# ── Determine script directory ────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  error "docker-compose.yml not found at $COMPOSE_FILE"
fi

# ── Pull latest image ─────────────────────────────────────────────────────────
info "Pulling latest Open WebUI image..."
docker pull ghcr.io/open-webui/open-webui:main

# ── Start services ────────────────────────────────────────────────────────────
info "Starting Open WebUI with ReGraph..."

export REGRAPH_API_KEY
export OPENWEBUI_PORT="$PORT"

# Patch port in compose if needed
if [[ "$PORT" != "3000" ]]; then
  sed "s/3000:8080/$PORT:8080/" "$COMPOSE_FILE" | \
    REGRAPH_API_KEY="$REGRAPH_API_KEY" $COMPOSE -f - up -d
else
  $COMPOSE -f "$COMPOSE_FILE" up -d
fi

# ── Wait for health ────────────────────────────────────────────────────────────
info "Waiting for Open WebUI to start..."
TIMEOUT=60
ELAPSED=0
until curl -sf "http://localhost:$PORT/health" &>/dev/null; do
  if [[ $ELAPSED -ge $TIMEOUT ]]; then
    warn "Startup taking longer than expected. Check: docker logs open-webui-regraph"
    break
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}✅  Setup complete!${NC}"
echo ""
echo -e "  ${BOLD}Open WebUI:${NC}     http://localhost:$PORT"
echo -e "  ${BOLD}Provider:${NC}       ReGraph (https://api.regraph.tech/v1)"
echo -e "  ${BOLD}Models:${NC}         https://regraph.tech/models"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "  1. Open http://localhost:$PORT in your browser"
echo "  2. Create your admin account"
echo "  3. Select a model (e.g. gpt-5, claude-opus-4.5, gemini-3-pro)"
echo "  4. Start chatting!"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  View logs:    docker logs -f open-webui-regraph"
echo "  Stop:         $COMPOSE -f \"$COMPOSE_FILE\" down"
echo "  Update:       docker pull ghcr.io/open-webui/open-webui:main && $COMPOSE -f \"$COMPOSE_FILE\" up -d"
echo ""
