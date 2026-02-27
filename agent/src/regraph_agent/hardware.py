"""Hardware detection — GPU (NVIDIA/ROCm/Metal/DirectML/Ascend), CPU, RAM, NPU."""

from __future__ import annotations

import platform
import re
import shutil
import subprocess
from dataclasses import dataclass, field

import psutil


@dataclass
class GpuInfo:
    name: str
    vram_mb: int
    driver: str = ""
    cuda_version: str = ""
    backend: str = "unknown"   # nvidia | rocm | metal | directml | mps
    device_index: int = 0
    npu_info: str = ""       # extra info string for Ascend / other NPUs


@dataclass
class HardwareReport:
    hostname: str = ""
    os: str = ""
    arch: str = ""
    python_version: str = ""
    cpu_model: str = ""
    cpu_cores: int = 0
    cpu_cores_physical: int = 0
    ram_total_mb: int = 0
    disk_total_gb: float = 0.0
    gpus: list[GpuInfo] = field(default_factory=list)
    gpu_mode: str = "disabled"
    has_npu: bool = False

    def summary(self) -> dict:
        return {
            "hostname": self.hostname,
            "os": self.os,
            "arch": self.arch,
            "cpu_model": self.cpu_model,
            "cpu_cores": self.cpu_cores,
            "cpu_cores_physical": self.cpu_cores_physical,
            "ram_total_mb": self.ram_total_mb,
            "disk_total_gb": self.disk_total_gb,
            "gpu_mode": self.gpu_mode,
            "has_npu": self.has_npu,
            "gpus": [
                {
                    "index": g.device_index,
                    "name": g.name,
                    "vram_mb": g.vram_mb,
                    "backend": g.backend,
                    "driver": g.driver,
                    "cuda_version": g.cuda_version,
                }
                for g in self.gpus
            ],
        }


def _run(cmd: list[str], timeout: int = 10) -> str:
    """Run a subprocess and return stdout, empty string on failure."""
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return r.stdout.strip() if r.returncode == 0 else ""
    except Exception:
        return ""


# ── NVIDIA ────────────────────────────────────────────────────────────────────

def _detect_nvidia() -> list[GpuInfo]:
    if not shutil.which("nvidia-smi"):
        return []

    query_fields = "index,name,memory.total,driver_version"
    raw = _run([
        "nvidia-smi",
        f"--query-gpu={query_fields}",
        "--format=csv,noheader,nounits",
    ])
    if not raw:
        return []

    # Detect CUDA version
    cuda_version = ""
    nvcc = shutil.which("nvcc")
    if nvcc:
        out = _run(["nvcc", "--version"])
        m = re.search(r"release (\d+\.\d+)", out)
        if m:
            cuda_version = m.group(1)
    if not cuda_version:
        # Try from nvidia-smi header
        header = _run(["nvidia-smi"])
        m = re.search(r"CUDA Version:\s*(\d+\.\d+)", header)
        if m:
            cuda_version = m.group(1)

    # Try PyTorch CUDA as fallback
    if not cuda_version:
        try:
            import torch  # type: ignore
            if torch.cuda.is_available():
                cuda_version = torch.version.cuda or ""
        except ImportError:
            pass

    gpus = []
    for line in raw.strip().split("\n"):
        parts = [p.strip() for p in line.split(",")]
        if len(parts) < 4:
            continue
        idx, name, vram_str, driver = parts[0], parts[1], parts[2], parts[3]
        try:
            vram_mb = int(float(vram_str))
        except ValueError:
            vram_mb = 0
        gpus.append(GpuInfo(
            name=name,
            vram_mb=vram_mb,
            driver=driver,
            cuda_version=cuda_version,
            backend="nvidia",
            device_index=int(idx) if idx.isdigit() else len(gpus),
        ))
    return gpus


# ── ROCm (AMD) ────────────────────────────────────────────────────────────────

def _detect_rocm() -> list[GpuInfo]:
    if not shutil.which("rocm-smi"):
        return []

    # Try JSON output first (ROCm 5.3+)
    json_out = _run(["rocm-smi", "--showproductname", "--json"])
    if json_out:
        try:
            import json
            data = json.loads(json_out)
            gpus = []
            for key, info in data.items():
                name = info.get("Card series", info.get("Card model", "AMD GPU"))
                gpus.append(GpuInfo(
                    name=name,
                    vram_mb=0,
                    backend="rocm",
                    device_index=len(gpus),
                ))
            if gpus:
                return gpus
        except Exception:
            pass

    # Fallback: text output
    out = _run(["rocm-smi", "--showproductname"])
    if not out:
        return []

    gpus = []
    for line in out.split("\n"):
        if "GPU" in line and ":" in line:
            name = line.split(":")[-1].strip() or "AMD GPU (ROCm)"
            gpus.append(GpuInfo(name=name, vram_mb=0, backend="rocm", device_index=len(gpus)))
    return gpus or [GpuInfo(name="AMD GPU (ROCm)", vram_mb=0, backend="rocm")]


# ── Apple Silicon (Metal / MPS) ───────────────────────────────────────────────

def _detect_apple_silicon() -> list[GpuInfo]:
    if platform.system() != "Darwin":
        return []

    chip_name = _run(["sysctl", "-n", "machdep.cpu.brand_string"]) or "Apple Silicon"

    # Unified memory — report system RAM as VRAM equivalent
    ram_bytes = psutil.virtual_memory().total
    vram_mb = int(ram_bytes / (1024 * 1024))  # shared memory

    # Check for MPS availability (PyTorch)
    backend = "metal"
    try:
        import torch  # type: ignore
        if torch.backends.mps.is_available():
            backend = "metal"  # MPS uses Metal under the hood
    except ImportError:
        pass

    if platform.machine() == "arm64":
        return [GpuInfo(name=chip_name, vram_mb=vram_mb, backend=backend)]
    return []


# ── DirectML (Windows, Intel/AMD/NVIDIA) ──────────────────────────────────────

def _detect_directml() -> list[GpuInfo]:
    if platform.system() != "Windows":
        return []
    try:
        import torch_directml  # type: ignore
        count = torch_directml.device_count()
        gpus = []
        for i in range(count):
            name = torch_directml.device_name(i)
            gpus.append(GpuInfo(name=name, vram_mb=0, backend="directml", device_index=i))
        return gpus
    except ImportError:
        pass

    # Fallback: check WMI
    try:
        out = _run(["powershell", "-Command",
                    "Get-WmiObject Win32_VideoController | Select-Object Name | Format-List"])
        gpus = []
        for line in out.split("\n"):
            if "Name" in line and ":" in line:
                name = line.split(":", 1)[-1].strip()
                if name:
                    gpus.append(GpuInfo(name=name, vram_mb=0, backend="directml",
                                        device_index=len(gpus)))
        return gpus
    except Exception:
        return []


# ── NPU detection ─────────────────────────────────────────────────────────────

def _detect_npu() -> bool:
    """Detect NPU presence (Qualcomm Hexagon, Intel NPU, Apple Neural Engine)."""
    if platform.system() == "Darwin" and platform.machine() == "arm64":
        # Apple Silicon always has ANE
        return True
    if platform.system() == "Windows":
        try:
            out = _run(["powershell", "-Command",
                        "Get-PnpDevice | Where-Object {$_.FriendlyName -match 'NPU|Neural'} | Select-Object FriendlyName"])
            if "NPU" in out or "Neural" in out:
                return True
        except Exception:
            pass
    return False


# ── Main detector ─────────────────────────────────────────────────────────────

def detect_hardware(gpu_mode: str = "auto") -> HardwareReport:
    """Detect all available hardware on the current machine."""
    sys_name = platform.system()

    report = HardwareReport(
        hostname=platform.node(),
        os=sys_name.lower(),
        arch=platform.machine(),
        python_version=platform.python_version(),
        cpu_cores=psutil.cpu_count(logical=True) or 1,
        cpu_cores_physical=psutil.cpu_count(logical=False) or 1,
        ram_total_mb=int(psutil.virtual_memory().total / (1024 * 1024)),
        disk_total_gb=round(psutil.disk_usage("/").total / (1024 ** 3), 1),
    )

    # CPU model
    if sys_name == "Linux":
        try:
            with open("/proc/cpuinfo") as f:
                for line in f:
                    if "model name" in line:
                        report.cpu_model = line.split(":", 1)[1].strip()
                        break
        except OSError:
            report.cpu_model = platform.processor()
    elif sys_name == "Darwin":
        report.cpu_model = (
            _run(["sysctl", "-n", "machdep.cpu.brand_string"]) or platform.processor()
        )
    elif sys_name == "Windows":
        report.cpu_model = (
            _run(["wmic", "cpu", "get", "name", "/value"]).replace("Name=", "").strip()
            or platform.processor()
        )
    else:
        report.cpu_model = platform.processor()

    # NPU
    report.has_npu = _detect_npu()

    # GPU detection (skip if explicitly disabled)
    if gpu_mode == "disabled":
        report.gpu_mode = "disabled"
        return report

    # Ordered by preference: NVIDIA > ROCm > Metal > DirectML
    detectors: list[tuple[str, Any]] = [
        ("nvidia", _detect_nvidia),
        ("rocm", _detect_rocm),
        ("metal", _detect_apple_silicon),
        ("directml", _detect_directml),
    ]

    if gpu_mode != "auto":
        # Only run the requested detector
        detectors = [(k, fn) for k, fn in detectors if k == gpu_mode]

    for backend_name, detector in detectors:
        try:
            gpus = detector()
            if gpus:
                report.gpus.extend(gpus)
                if not report.gpu_mode or report.gpu_mode == "disabled":
                    report.gpu_mode = backend_name
        except Exception as exc:
            import logging as _log
            _log.getLogger("regraph.hardware").debug("Detector %s failed: %s", backend_name, exc)

    if not report.gpus:
        report.gpu_mode = "disabled"

    return report
