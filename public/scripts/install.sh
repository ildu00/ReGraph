#!/bin/bash
# ReGraph Provider Agent Installer
# https://regraph.tech

set -e

REGRAPH_VERSION="1.0.0"
REGRAPH_DIR="$HOME/.regraph"
REGRAPH_BIN="$REGRAPH_DIR/bin"

echo "╔══════════════════════════════════════════════╗"
echo "║       ReGraph Provider Agent Installer       ║"
echo "║              Version $REGRAPH_VERSION               ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Detect OS and architecture
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$ARCH" in
    x86_64)  ARCH="amd64" ;;
    aarch64) ARCH="arm64" ;;
    arm64)   ARCH="arm64" ;;
    *)       echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

echo "→ Detected: $OS ($ARCH)"

# Create directories
echo "→ Creating installation directory..."
mkdir -p "$REGRAPH_BIN"

# Download agent binary (placeholder URL)
DOWNLOAD_URL="https://releases.regraph.tech/agent/$REGRAPH_VERSION/regraph-agent-$OS-$ARCH"
echo "→ Downloading ReGraph agent..."
# curl -sSL "$DOWNLOAD_URL" -o "$REGRAPH_BIN/regraph-agent"
# chmod +x "$REGRAPH_BIN/regraph-agent"

# Create placeholder binary for demo
cat > "$REGRAPH_BIN/regraph-agent" << 'EOF'
#!/bin/bash
echo "ReGraph Agent v1.0.0"
echo "Usage: regraph-agent --key <CONNECTION_KEY>"
echo ""
echo "Options:"
echo "  --key       Your device connection key from the dashboard"
echo "  --gpu       Enable GPU compute (default: auto-detect)"
echo "  --cpu-only  CPU-only mode"
echo "  --help      Show this help message"
EOF
chmod +x "$REGRAPH_BIN/regraph-agent"

# Add to PATH
SHELL_CONFIG=""
if [ -n "$ZSH_VERSION" ] || [ -f "$HOME/.zshrc" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
elif [ -f "$HOME/.bashrc" ]; then
    SHELL_CONFIG="$HOME/.bashrc"
elif [ -f "$HOME/.bash_profile" ]; then
    SHELL_CONFIG="$HOME/.bash_profile"
fi

if [ -n "$SHELL_CONFIG" ]; then
    if ! grep -q "REGRAPH_DIR" "$SHELL_CONFIG" 2>/dev/null; then
        echo "" >> "$SHELL_CONFIG"
        echo "# ReGraph Agent" >> "$SHELL_CONFIG"
        echo "export PATH=\"\$PATH:$REGRAPH_BIN\"" >> "$SHELL_CONFIG"
        echo "→ Added to PATH in $SHELL_CONFIG"
    fi
fi

echo ""
echo "✓ Installation complete!"
echo ""
echo "Next steps:"
echo "  1. Restart your terminal or run: source $SHELL_CONFIG"
echo "  2. Start the agent: regraph-agent --key YOUR_CONNECTION_KEY"
echo ""
echo "Get your connection key from: https://regraph.tech/dashboard"
echo ""
