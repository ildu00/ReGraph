# ReGraph Provider Agent Installer for Windows
# https://regraph.tech
#
# Usage:
#   irm https://regraph.tech/scripts/install.ps1 | iex
#   .\install.ps1 -Key "YOUR_CONNECTION_KEY"
#   .\install.ps1 -Key "YOUR_KEY" -GpuMode nvidia -Version "1.2.0"

param(
  [string]$Key = "",
  [ValidateSet("auto", "nvidia", "disabled")]
  [string]$GpuMode = "auto",
  [string]$Version = "1.2.0",
  [switch]$NoService,
  [switch]$CpuOnly,
  [switch]$Help
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$REGRAPH_REPO = "regraph-tech/agent"
$REGRAPH_API = "https://github.com/$REGRAPH_REPO/releases/download"
$REGRAPH_DIR = "$env:LOCALAPPDATA\ReGraph"
$REGRAPH_BIN = "$REGRAPH_DIR\bin"
$REGRAPH_CONFIG = "$REGRAPH_DIR\config.yaml"
$REGRAPH_LOG = "$REGRAPH_DIR\logs"
$AGENT_EXE = "$REGRAPH_BIN\regraph-agent.exe"

if ($CpuOnly) { $GpuMode = "disabled" }

# ─── Help ─────────────────────────────────────────────────
if ($Help) {
  Write-Host @"

  ReGraph Provider Agent Installer

  PARAMETERS:
    -Key <STRING>       Connection key from your ReGraph dashboard
    -GpuMode <STRING>   GPU mode: auto | nvidia | disabled (default: auto)
    -Version <STRING>   Agent version to install (default: $Version)
    -CpuOnly            Disable GPU, use CPU only
    -NoService          Skip Windows Task Scheduler setup
    -Help               Show this message

  EXAMPLES:
    irm https://regraph.tech/scripts/install.ps1 | iex
    .\install.ps1 -Key "rg_conn_abc123"
    .\install.ps1 -Key "rg_conn_abc123" -GpuMode nvidia

"@
  exit 0
}

# ─── Banner ───────────────────────────────────────────────
function Print-Banner {
  Write-Host ""
  Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
  Write-Host "║       ReGraph Provider Agent Installer          ║" -ForegroundColor Cyan
  Write-Host "║              Version $Version                     ║" -ForegroundColor Cyan
  Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
  Write-Host ""
}

function Log-Info  { param([string]$msg) Write-Host "  → $msg" -ForegroundColor Gray }
function Log-Ok    { param([string]$msg) Write-Host "  ✓ $msg" -ForegroundColor Green }
function Log-Warn  { param([string]$msg) Write-Host "  ⚠ $msg" -ForegroundColor Yellow }
function Log-Error { param([string]$msg) Write-Host "  ✗ $msg" -ForegroundColor Red }

# ─── Detect platform ─────────────────────────────────────
function Detect-Platform {
  $script:Arch = if ([Environment]::Is64BitOperatingSystem) { "amd64" } else { "386" }
  $osVer = [System.Environment]::OSVersion.Version
  Log-Info "Platform: Windows $($osVer.Major).$($osVer.Minor) ($script:Arch)"

  if ($osVer.Major -lt 10) {
    Log-Warn "Windows 10+ recommended. Older versions may have limited support."
  }
}

# ─── Detect GPU ───────────────────────────────────────────
function Detect-GPU {
  if ($GpuMode -eq "disabled") {
    Log-Info "GPU: disabled (--CpuOnly)"
    return
  }

  $gpuFound = $false

  # NVIDIA
  $nvidiaSmi = Get-Command "nvidia-smi" -ErrorAction SilentlyContinue
  if ($nvidiaSmi) {
    $gpuFound = $true
    try {
      $gpuName = & nvidia-smi --query-gpu=name --format=csv,noheader,nounits 2>$null | Select-Object -First 1
      $gpuMem = & nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>$null | Select-Object -First 1
      $driverVer = & nvidia-smi --query-gpu=driver_version --format=csv,noheader 2>$null | Select-Object -First 1
      $gpuCount = (& nvidia-smi --query-gpu=name --format=csv,noheader 2>$null | Measure-Object).Count

      Log-Ok "GPU detected: NVIDIA $($gpuName.Trim()) ($($gpuMem.Trim()) MiB VRAM) x $gpuCount — Driver $($driverVer.Trim())"
      $script:GpuMode = "nvidia"
    } catch {
      Log-Ok "NVIDIA GPU detected (details unavailable)"
      $script:GpuMode = "nvidia"
    }

    # Check CUDA
    $nvcc = Get-Command "nvcc" -ErrorAction SilentlyContinue
    if ($nvcc) {
      try {
        $cudaVer = & nvcc --version 2>$null | Select-String "release" | ForEach-Object { $_ -replace '.*release\s+', '' -replace ',.*', '' }
        Log-Info "CUDA $cudaVer available"
      } catch {}
    }
  }

  # DirectML / Generic GPU check
  if (-not $gpuFound) {
    try {
      $gpuDevices = Get-CimInstance -ClassName Win32_VideoController -ErrorAction SilentlyContinue
      foreach ($gpu in $gpuDevices) {
        if ($gpu.Name -notmatch "Microsoft|Basic|Remote") {
          $gpuFound = $true
          Log-Ok "GPU detected: $($gpu.Name) (DirectML compatible)"
          $script:GpuMode = "directml"
          break
        }
      }
    } catch {}
  }

  if (-not $gpuFound) {
    $script:GpuMode = "disabled"
    Log-Warn "No GPU detected — running in CPU-only mode"
  }
}

# ─── Download & install ──────────────────────────────────
function Install-Agent {
  Log-Info "Creating directories..."
  New-Item -ItemType Directory -Force -Path $REGRAPH_BIN | Out-Null
  New-Item -ItemType Directory -Force -Path $REGRAPH_LOG | Out-Null

  $archive = "regraph-agent-windows-$script:Arch.zip"
  $url = "$REGRAPH_API/agent/v$Version/$archive"
  $checksumUrl = "$url.sha256"
  $tmpDir = Join-Path $env:TEMP "regraph-install-$(Get-Random)"
  New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

  Log-Info "Downloading ReGraph agent v$Version..."
  Log-Info $url

  try {
    Invoke-WebRequest -Uri $url -OutFile "$tmpDir\$archive" -UseBasicParsing
  } catch {
    Log-Error "Download failed: $($_.Exception.Message)"
    Log-Info "Check your internet connection or verify version $Version exists."
    Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue
    exit 1
  }

  # Verify checksum
  Log-Info "Verifying integrity..."
  try {
    Invoke-WebRequest -Uri $checksumUrl -OutFile "$tmpDir\$archive.sha256" -UseBasicParsing
    $expected = (Get-Content "$tmpDir\$archive.sha256" -Raw).Trim().Split(" ")[0]
    $actual = (Get-FileHash "$tmpDir\$archive" -Algorithm SHA256).Hash.ToLower()

    if ($actual -ne $expected) {
      Log-Error "Checksum verification failed!"
      Log-Error "Expected: $expected"
      Log-Error "Actual:   $actual"
      Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue
      exit 1
    }
    Log-Ok "Checksum verified"
  } catch {
    Log-Warn "Checksum file not available — skipping verification"
  }

  # Extract
  Log-Info "Extracting..."
  try {
    Expand-Archive -Path "$tmpDir\$archive" -DestinationPath $tmpDir -Force
  } catch {
    Log-Error "Failed to extract archive: $($_.Exception.Message)"
    Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue
    exit 1
  }

  # Find and move binary
  $agentBin = Get-ChildItem -Path $tmpDir -Filter "regraph-agent.exe" -Recurse | Select-Object -First 1
  if (-not $agentBin) {
    $agentBin = Get-ChildItem -Path $tmpDir -Filter "regraph-agent*" -Recurse | Where-Object { $_.Extension -eq ".exe" } | Select-Object -First 1
  }

  if (-not $agentBin) {
    Log-Error "Agent binary not found in archive"
    Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue
    exit 1
  }

  # Stop existing agent if running
  $existingProcess = Get-Process -Name "regraph-agent" -ErrorAction SilentlyContinue
  if ($existingProcess) {
    Log-Info "Stopping existing agent process..."
    Stop-Process -Name "regraph-agent" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
  }

  Copy-Item -Path $agentBin.FullName -Destination $AGENT_EXE -Force
  Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue

  Log-Ok "Agent installed to $AGENT_EXE"
}

# ─── Write config ─────────────────────────────────────────
function Write-AgentConfig {
  if (Test-Path $REGRAPH_CONFIG) {
    Log-Warn "Config already exists at $REGRAPH_CONFIG — preserving"
    return
  }

  $config = @"
# ReGraph Provider Agent Configuration
# Documentation: https://regraph.tech/docs

agent:
  version: "$Version"

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
  directory: "$($REGRAPH_LOG -replace '\\', '/')"
  max_size_mb: 100
  rotate: true

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
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  if ($userPath -notlike "*$REGRAPH_BIN*") {
    [Environment]::SetEnvironmentVariable("Path", "$userPath;$REGRAPH_BIN", "User")
    $env:Path = "$env:Path;$REGRAPH_BIN"
    Log-Ok "Added to user PATH"
  } else {
    Log-Info "PATH already configured"
  }
}

# ─── Install scheduled task ──────────────────────────────
function Install-ScheduledTask {
  if ($NoService) {
    Log-Info "Scheduled task installation skipped (-NoService)"
    return
  }

  $taskName = "ReGraphAgent"

  # Remove existing task
  $existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  if ($existing) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  }

  try {
    $action = New-ScheduledTaskAction -Execute $AGENT_EXE -Argument "--config `"$REGRAPH_CONFIG`"" -WorkingDirectory $REGRAPH_DIR
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
    $settings = New-ScheduledTaskSettingsSet `
      -AllowStartIfOnBatteries `
      -DontStopIfGoingOnBatteries `
      -StartWhenAvailable `
      -RestartCount 3 `
      -RestartInterval (New-TimeSpan -Minutes 1) `
      -ExecutionTimeLimit (New-TimeSpan -Days 365)

    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "ReGraph Provider Agent — Decentralized AI Compute" | Out-Null

    Log-Ok "Scheduled task '$taskName' created (starts at login)"
    Log-Info "Start now:   schtasks /run /tn $taskName"
    Log-Info "Stop:        schtasks /end /tn $taskName"
  } catch {
    Log-Warn "Failed to create scheduled task: $($_.Exception.Message)"
    Log-Info "You can start the agent manually: regraph-agent --config `"$REGRAPH_CONFIG`""
  }
}

# ─── Verify ───────────────────────────────────────────────
function Verify-Install {
  if (-not (Test-Path $AGENT_EXE)) {
    Log-Error "Installation verification failed — binary not found"
    exit 1
  }

  try {
    $agentVersion = & $AGENT_EXE --version 2>$null
    Log-Ok "Agent binary verified: $agentVersion"
  } catch {
    Log-Ok "Agent binary exists at $AGENT_EXE"
  }
}

# ─── Summary ──────────────────────────────────────────────
function Print-Summary {
  Write-Host ""
  Write-Host "════════════════════════════════════════════════════" -ForegroundColor Green
  Write-Host "  Installation complete!" -ForegroundColor Green
  Write-Host "════════════════════════════════════════════════════" -ForegroundColor Green
  Write-Host ""
  Write-Host "  Agent:   $AGENT_EXE"
  Write-Host "  Config:  $REGRAPH_CONFIG"
  Write-Host "  Logs:    $REGRAPH_LOG"
  Write-Host "  GPU:     $GpuMode"
  Write-Host ""

  if ([string]::IsNullOrEmpty($Key)) {
    Write-Host "  ⚠ No connection key provided." -ForegroundColor Yellow
    Write-Host "  Get your key from: " -NoNewline
    Write-Host "https://regraph.tech/dashboard" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Then start the agent:"
    Write-Host "    regraph-agent --key YOUR_CONNECTION_KEY" -ForegroundColor White
  } else {
    Write-Host "  Start the agent:"
    if (-not $NoService) {
      Write-Host "    schtasks /run /tn ReGraphAgent" -ForegroundColor White
    } else {
      Write-Host "    regraph-agent --config `"$REGRAPH_CONFIG`"" -ForegroundColor White
    }
  }

  Write-Host ""
  Write-Host "  Documentation:  " -NoNewline; Write-Host "https://regraph.tech/docs" -ForegroundColor Cyan
  Write-Host "  Dashboard:      " -NoNewline; Write-Host "https://regraph.tech/dashboard" -ForegroundColor Cyan
  Write-Host "  Support:        " -NoNewline; Write-Host "https://regraph.tech/support" -ForegroundColor Cyan
  Write-Host ""
}

# ─── Main ─────────────────────────────────────────────────
Print-Banner
Detect-Platform
Detect-GPU
Install-Agent
Write-AgentConfig
Configure-Path
Install-ScheduledTask
Verify-Install
Print-Summary
