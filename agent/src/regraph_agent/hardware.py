"""Hardware detection — GPU, CPU, memory, NPU."""

from __future__ import annotations

import platform
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
    backend: str = "unknown"  # nvidia | rocm | metal | directml


@dataclass
class HardwareReport:
    hostname: str = ""
    os: str = ""
    arch: str = ""
    python_version: str = ""
    cpu_model: str = ""
    cpu_cores: int = 0
    ram_total_mb: int = 0
    gpus: list[GpuInfo] = field(default_factory=list)
    gpu_mode: str = "disabled"

    def summary(self) -> dict:
        return {
            "hostname": self.hostname,
            "os": self.os,
            "arch": self.arch,
            "cpu_model": self.cpu_model,
            "cpu_cores": self.cpu_cores,
            "ram_total_mb": self.ram_total_mb,
            "gpu_mode": self.gpu_mode,
            "gpus": [
                {"name": g.name, "vram_mb": g.vram_mb, "backend": g.backend}
                for g in self.gpus
            ],
        }


def _run(cmd: list[str]) -> str:
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        return r.stdout.strip() if r.returncode == 0 else ""
    except Exception:
        return ""


def _detect_nvidia() -> list[GpuInfo]:
    if not shutil.which("nvidia-smi"):
        return []
    names = _run(["nvidia-smi", "--query-gpu=name", "--format=csv,noheader,nounits"])
    vrams = _run(["nvidia-smi", "--query-gpu=memory.total", "--format=csv,noheader,nounits"])
    drivers = _run(["nvidia-smi", "--query-gpu=driver_version", "--format=csv,noheader"])
    if not names:
        return []

    cuda = ""
    nvcc = shutil.which("nvcc")
    if nvcc:
        out = _run(["nvcc", "--version"])
        for line in out.split("\n"):
            if "release" in line:
                cuda = line.split("release")[-1].split(",")[0].strip()

    gpus = []
    for i, name in enumerate(names.split("\n")):
        vram_list = vrams.split("\n") if vrams else []
        driver_list = drivers.split("\n") if drivers else []
        gpus.append(GpuInfo(
            name=name.strip(),
            vram_mb=int(vram_list[i].strip()) if i < len(vram_list) else 0,
            driver=driver_list[i].strip() if i < len(driver_list) else "",
            cuda_version=cuda,
            backend="nvidia",
        ))
    return gpus


def _detect_rocm() -> list[GpuInfo]:
    if not shutil.which("rocm-smi"):
        return []
    out = _run(["rocm-smi", "--showproductname"])
    if not out:
        return []
    return [GpuInfo(name="AMD GPU (ROCm)", vram_mb=0, backend="rocm")]


def _detect_apple_silicon() -> list[GpuInfo]:
    if platform.system() != "Darwin" or platform.machine() != "arm64":
        return []
    chip = _run(["sysctl", "-n", "machdep.cpu.brand_string"]) or "Apple Silicon"
    return [GpuInfo(name=chip, vram_mb=0, backend="metal")]


def detect_hardware(gpu_mode: str = "auto") -> HardwareReport:
    """Detect all available hardware."""
    report = HardwareReport(
        hostname=platform.node(),
        os=platform.system().lower(),
        arch=platform.machine(),
        python_version=platform.python_version(),
        cpu_cores=psutil.cpu_count(logical=True) or 1,
        ram_total_mb=int(psutil.virtual_memory().total / (1024 * 1024)),
    )

    # CPU model
    if platform.system() == "Linux":
        try:
            with open("/proc/cpuinfo") as f:
                for line in f:
                    if "model name" in line:
                        report.cpu_model = line.split(":")[1].strip()
                        break
        except OSError:
            pass
    elif platform.system() == "Darwin":
        report.cpu_model = _run(["sysctl", "-n", "machdep.cpu.brand_string"])
    else:
        report.cpu_model = platform.processor()

    # GPU detection
    if gpu_mode != "disabled":
        for detector in [_detect_nvidia, _detect_rocm, _detect_apple_silicon]:
            gpus = detector()
            if gpus:
                report.gpus.extend(gpus)
                report.gpu_mode = gpus[0].backend
                if gpu_mode != "auto":
                    break  # use first match when specific mode requested

    if not report.gpus:
        report.gpu_mode = "disabled"

    return report
