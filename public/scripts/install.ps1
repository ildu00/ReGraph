# ReGraph Provider Agent Installer for Windows
# https://regraph.tech

$ErrorActionPreference = "Stop"

$REGRAPH_VERSION = "1.0.0"
$REGRAPH_DIR = "$env:LOCALAPPDATA\ReGraph"
$REGRAPH_BIN = "$REGRAPH_DIR\bin"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       ReGraph Provider Agent Installer       ║" -ForegroundColor Cyan
Write-Host "║              Version $REGRAPH_VERSION               ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check for admin rights (optional, for system-wide install)
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

# Detect architecture
$arch = if ([Environment]::Is64BitOperatingSystem) { "amd64" } else { "386" }
Write-Host "→ Detected: Windows ($arch)" -ForegroundColor Gray

# Create directories
Write-Host "→ Creating installation directory..." -ForegroundColor Gray
New-Item -ItemType Directory -Force -Path $REGRAPH_BIN | Out-Null

# Download agent binary (placeholder)
$downloadUrl = "https://releases.regraph.tech/agent/$REGRAPH_VERSION/regraph-agent-windows-$arch.exe"
$agentPath = "$REGRAPH_BIN\regraph-agent.exe"

Write-Host "→ Downloading ReGraph agent..." -ForegroundColor Gray
# Invoke-WebRequest -Uri $downloadUrl -OutFile $agentPath

# Create placeholder script for demo
$placeholderScript = @"
@echo off
echo ReGraph Agent v1.0.0
echo Usage: regraph-agent --key ^<CONNECTION_KEY^>
echo.
echo Options:
echo   --key       Your device connection key from the dashboard
echo   --gpu       Enable GPU compute (default: auto-detect)
echo   --cpu-only  CPU-only mode
echo   --help      Show this help message
"@
Set-Content -Path "$REGRAPH_BIN\regraph-agent.bat" -Value $placeholderScript

# Add to PATH
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$REGRAPH_BIN*") {
    Write-Host "→ Adding to PATH..." -ForegroundColor Gray
    [Environment]::SetEnvironmentVariable("Path", "$userPath;$REGRAPH_BIN", "User")
}

Write-Host ""
Write-Host "✓ Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Restart your terminal/PowerShell"
Write-Host "  2. Start the agent: regraph-agent --key YOUR_CONNECTION_KEY"
Write-Host ""
Write-Host "Get your connection key from: https://regraph.tech/dashboard" -ForegroundColor Cyan
Write-Host ""
