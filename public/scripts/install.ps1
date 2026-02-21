# ReGraph Provider Agent Installer for Windows
# https://regraph.tech
#
# Usage:
#   irm https://regraph.tech/scripts/install.ps1 | iex
#   .\install.ps1 -Key "YOUR_CONNECTION_KEY"

param(
  [string]$Key = "",
  [ValidateSet("auto", "nvidia", "disabled")]
  [string]$GpuMode = "auto",
  [switch]$CpuOnly,
  [switch]$NoService,
  [switch]$Help
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$REGRAPH_VERSION = "1.2.0"
$REGRAPH_REPO = "https://github.com/regraph-tech/agent.git"
$REGRAPH_DIR = "$env:LOCALAPPDATA\ReGraph"
$REGRAPH_VENV = "$REGRAPH_DIR\venv"
$REGRAPH_SRC = "$REGRAPH_DIR\src"
$REGRAPH_CONFIG = "$REGRAPH_DIR\config.yaml"
$REGRAPH_LOG = "$REGRAPH_DIR\logs"

if ($CpuOnly) { $GpuMode = "disabled" }

if ($Help) {
  Write-Host @"

  ReGraph Provider Agent Installer

  PARAMETERS:
    -Key <STRING>       Connection key from your ReGraph dashboard
    -GpuMode <STRING>   auto | nvidia | disabled (default: auto)
    -CpuOnly            Disable GPU
    -NoService          Skip Task Scheduler setup
    -Help               Show this message

  EXAMPLES:
    irm https://regraph.tech/scripts/install.ps1 | iex
    .\install.ps1 -Key "rg_conn_abc123"

"@
  exit 0
}

# ─── Helpers ──────────────────────────────────────────────
function Log-Info  { param([string]$msg) Write-Host "  → $msg" -ForegroundColor Gray }
function Log-Ok    { param([string]$msg) Write-Host "  ✓ $msg" -ForegroundColor Green }
function Log-Warn  { param([string]$msg) Write-Host "  ⚠ $msg" -ForegroundColor Yellow }
function Log-Error { param([string]$msg) Write-Host "  ✗ $msg" -ForegroundColor Red }

function Print-Banner {
  Write-Host ""
  Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
  Write-Host "║       ReGraph Provider Agent Installer          ║" -ForegroundColor Cyan
  Write-Host "║              Version $REGRAPH_VERSION                     ║" -ForegroundColor Cyan
  Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
  Write-Host ""
}

# ─── Check Python ─────────────────────────────────────────
function Check-Python {
  $script:PythonCmd = $null

  foreach ($cmd in @("python3", "python", "py")) {
    $found = Get-Command $cmd -ErrorAction SilentlyContinue
    if ($found) {
      try {
        $ver = & $cmd -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>$null
        $parts = $ver.Split(".")
        if ([int]$parts[0] -ge 3 -and [int]$parts[1] -ge 10) {
          $script:PythonCmd = $cmd
          break
        }
      } catch {}
    }
  }

  if (-not $script:PythonCmd) {
    Log-Error "Python 3.10+ is required but not found."
    Write-Host ""
    Write-Host "  Download Python from: https://www.python.org/downloads/" -ForegroundColor Cyan
    Write-Host "  Make sure to check 'Add Python to PATH' during installation." -ForegroundColor Yellow
    Write-Host ""
    exit 1
  }

  $fullVer = & $script:PythonCmd --version 2>&1
  Log-Ok "Python found: $fullVer"
}

# ─── Check Git ────────────────────────────────────────────
function Check-Git {
  if (-not (Get-Command "git" -ErrorAction SilentlyContinue)) {
    Log-Error "Git is required but not found."
    Write-Host ""
    Write-Host "  Download Git from: https://git-scm.com/download/win" -ForegroundColor Cyan
    Write-Host ""
    exit 1
  }
  $gitVer = & git --version 2>&1
  Log-Ok "Git found: $gitVer"
}

# ─── Detect GPU ───────────────────────────────────────────
function Detect-GPU {
  if ($GpuMode -eq "disabled") {
    Log-Info "GPU: disabled (-CpuOnly)"
    return
  }

  $gpuFound = $false

  # NVIDIA
  if (Get-Command "nvidia-smi" -ErrorAction SilentlyContinue) {
    $gpuFound = $true
    try {
      $gpuName = & nvidia-smi --query-gpu=name --format=csv,noheader,nounits 2>$null | Select-Object -First 1
      $gpuMem = & nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>$null | Select-Object -First 1
      $gpuCount = (& nvidia-smi --query-gpu=name --format=csv,noheader 2>$null | Measure-Object).Count
      Log-Ok "GPU: NVIDIA $($gpuName.Trim()) ($($gpuMem.Trim()) MiB) x $gpuCount"
    } catch {
      Log-Ok "NVIDIA GPU detected"
    }
    $script:GpuMode = "nvidia"
  }

  if (-not $gpuFound) {
    try {
      $gpuDevices = Get-CimInstance -ClassName Win32_VideoController -ErrorAction SilentlyContinue
      foreach ($gpu in $gpuDevices) {
        if ($gpu.Name -notmatch "Microsoft|Basic|Remote") {
          $gpuFound = $true
          Log-Ok "GPU: $($gpu.Name)"
          break
        }
      }
    } catch {}
  }

  if (-not $gpuFound) {
    $script:GpuMode = "disabled"
    Log-Warn "No GPU detected — CPU-only mode"
  }
}

# ─── Clone source ─────────────────────────────────────────
function Install-Source {
  New-Item -ItemType Directory -Force -Path $REGRAPH_DIR | Out-Null
  New-Item -ItemType Directory -Force -Path $REGRAPH_LOG | Out-Null

  if (Test-Path "$REGRAPH_SRC\.git") {
    Log-Info "Updating agent source..."
    Push-Location $REGRAPH_SRC
    & git fetch --quiet origin 2>$null
    & git reset --hard origin/main --quiet 2>$null
    Pop-Location
    Log-Ok "Agent source updated"
  } else {
    Log-Info "Cloning agent from GitHub..."
    if (Test-Path $REGRAPH_SRC) { Remove-Item -Recurse -Force $REGRAPH_SRC }
    & git clone --depth 1 $REGRAPH_REPO $REGRAPH_SRC 2>$null
    Log-Ok "Agent source cloned"
  }
}

# ─── Create venv & install ───────────────────────────────
function Install-Agent {
  if (-not (Test-Path $REGRAPH_VENV)) {
    Log-Info "Creating Python virtual environment..."
    & $script:PythonCmd -m venv $REGRAPH_VENV
    Log-Ok "Virtual environment created"
  }

  $pip = "$REGRAPH_VENV\Scripts\pip.exe"
  $agentBin = "$REGRAPH_VENV\Scripts\regraph-agent.exe"

  Log-Info "Installing agent and dependencies..."
  & $pip install --upgrade pip setuptools wheel --quiet 2>$null
  & $pip install -e $REGRAPH_SRC --quiet 2>$null

  if ($GpuMode -eq "nvidia") {
    Log-Info "Installing NVIDIA GPU support..."
    & $pip install GPUtil --quiet 2>$null
    try {
      & $pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu121 --quiet 2>$null
    } catch {
      Log-Warn "llama-cpp-python CUDA install failed — will use CPU fallback"
    }
  }

  try {
    $agentVer = & $agentBin --version 2>$null
    Log-Ok "Agent installed: $agentVer"
  } catch {
    Log-Ok "Agent installed to $agentBin"
  }
}

# ─── Write config ─────────────────────────────────────────
function Write-AgentConfig {
  if (Test-Path $REGRAPH_CONFIG) {
    Log-Warn "Config exists at $REGRAPH_CONFIG — preserving"
    return
  }

  $logDir = $REGRAPH_LOG -replace '\\', '/'

  $config = @"
# ReGraph Provider Agent Configuration
# https://regraph.tech/docs

network:
  api_url: "https://api.regraph.tech"
  connection_key: "$Key"

compute:
  gpu_mode: "$GpuMode"
  max_memory_percent: 80
  max_cpu_percent: 90
  idle_only: false

logging:
  level: "info"
  directory: "$logDir"
  max_size_mb: 100

provider:
  auto_update: true
  heartbeat_interval_sec: 30
  task_timeout_sec: 300
"@

  Set-Content -Path $REGRAPH_CONFIG -Value $config -Encoding UTF8
  Log-Ok "Config written to $REGRAPH_CONFIG"
}

# ─── Add to PATH ──────────────────────────────────────────
function Configure-Path {
  $venvBin = "$REGRAPH_VENV\Scripts"
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  if ($userPath -notlike "*$venvBin*") {
    [Environment]::SetEnvironmentVariable("Path", "$userPath;$venvBin", "User")
    $env:Path = "$env:Path;$venvBin"
    Log-Ok "Added to user PATH"
  } else {
    Log-Info "PATH already configured"
  }
}

# ─── Scheduled task ───────────────────────────────────────
function Install-ScheduledTask-Agent {
  if ($NoService) {
    Log-Info "Scheduled task skipped (-NoService)"
    return
  }

  $taskName = "ReGraphAgent"
  $agentBin = "$REGRAPH_VENV\Scripts\regraph-agent.exe"

  $existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  if ($existing) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  }

  try {
    $action = New-ScheduledTaskAction -Execute $agentBin -Argument "run --config `"$REGRAPH_CONFIG`"" -WorkingDirectory $REGRAPH_DIR
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
    $settings = New-ScheduledTaskSettingsSet `
      -AllowStartIfOnBatteries `
      -DontStopIfGoingOnBatteries `
      -StartWhenAvailable `
      -RestartCount 3 `
      -RestartInterval (New-TimeSpan -Minutes 1) `
      -ExecutionTimeLimit (New-TimeSpan -Days 365)

    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "ReGraph Provider Agent" | Out-Null

    Log-Ok "Scheduled task created (starts at login)"
    Log-Info "Start now: schtasks /run /tn $taskName"
  } catch {
    Log-Warn "Failed to create scheduled task: $($_.Exception.Message)"
  }
}

# ─── Summary ──────────────────────────────────────────────
function Print-Summary {
  Write-Host ""
  Write-Host "════════════════════════════════════════════════════" -ForegroundColor Green
  Write-Host "  Installation complete!" -ForegroundColor Green
  Write-Host "════════════════════════════════════════════════════" -ForegroundColor Green
  Write-Host ""
  Write-Host "  Agent:   $REGRAPH_VENV\Scripts\regraph-agent.exe"
  Write-Host "  Source:  $REGRAPH_SRC"
  Write-Host "  Config:  $REGRAPH_CONFIG"
  Write-Host "  Logs:    $REGRAPH_LOG"
  Write-Host "  GPU:     $GpuMode"
  Write-Host ""

  if ([string]::IsNullOrEmpty($Key)) {
    Write-Host "  ⚠ No connection key provided." -ForegroundColor Yellow
    Write-Host "  Get your key: " -NoNewline; Write-Host "https://regraph.tech/dashboard" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Then run:"
    Write-Host "    regraph-agent start --key YOUR_CONNECTION_KEY" -ForegroundColor White
  } else {
    Write-Host "  Start the agent:"
    if (-not $NoService) {
      Write-Host "    schtasks /run /tn ReGraphAgent" -ForegroundColor White
    } else {
      Write-Host "    regraph-agent start --key $Key" -ForegroundColor White
    }
  }

  Write-Host ""
  Write-Host "  Docs:      " -NoNewline; Write-Host "https://regraph.tech/docs" -ForegroundColor Cyan
  Write-Host "  Dashboard: " -NoNewline; Write-Host "https://regraph.tech/dashboard" -ForegroundColor Cyan
  Write-Host "  Support:   " -NoNewline; Write-Host "https://regraph.tech/support" -ForegroundColor Cyan
  Write-Host ""
}

# ─── Main ─────────────────────────────────────────────────
Print-Banner
Check-Python
Check-Git
Detect-GPU
Install-Source
Install-Agent
Write-AgentConfig
Configure-Path
Install-ScheduledTask-Agent
Print-Summary
