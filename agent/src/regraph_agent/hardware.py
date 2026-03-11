"""Hardware detection — GPU (NVIDIA/ROCm/Metal/DirectML/Ascend), CPU, RAM, NPU."""

from __future__ import annotations

import platform
import re
import shutil
import subprocess
from dataclasses import dataclass, field
from typing import Any

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


# ── Huawei Ascend NPU (CANN) ──────────────────────────────────────────────────

def _detect_ascend() -> list[GpuInfo]:
    """Detect Huawei Ascend NPUs via npu-smi (CANN toolkit)."""

    # Primary: npu-smi (CANN 6.x+)
    if shutil.which("npu-smi"):
        raw = _run(["npu-smi", "info", "-t", "detail"])
        if not raw:
            raw = _run(["npu-smi", "info"])

        if raw:
            gpus: list[GpuInfo] = []
            current: dict[str, str] = {}

            for line in raw.split("\n"):
                line = line.strip()
                if not line:
                    continue
                # Detect NPU index header like "NPU ID          : 0"
                m = re.match(r"NPU\s+ID\s*:\s*(\d+)", line, re.I)
                if m:
                    if current:
                        gpus.append(_ascend_entry(current, len(gpus)))
                    current = {"index": m.group(1)}
                    continue
                if ":" in line:
                    key, _, val = line.partition(":")
                    current[key.strip().lower()] = val.strip()

            if current:
                gpus.append(_ascend_entry(current, len(gpus)))

            if gpus:
                return gpus

    # Fallback: ascend-dmi (older CANN / MindSpore distributions)
    if shutil.which("ascend-dmi"):
        raw = _run(["ascend-dmi", "-i"])
        if raw:
            gpus = []
            for line in raw.split("\n"):
                m = re.search(r"NPU\s+(\d+)\s*:\s*(.+)", line, re.I)
                if m:
                    name = m.group(2).strip() or "Huawei Ascend NPU"
                    gpus.append(GpuInfo(
                        name=name,
                        vram_mb=0,
                        backend="ascend",
                        device_index=int(m.group(1)),
                    ))
            if gpus:
                return gpus

    # Fallback: Python torch_npu (MindSpore / PyTorch-NPU bridge)
    try:
        import torch_npu  # type: ignore
        count = torch_npu.npu.device_count()
        if count > 0:
            gpus = []
            for i in range(count):
                props = torch_npu.npu.get_device_properties(i)
                name = getattr(props, "name", f"Ascend NPU {i}")
                vram_mb = getattr(props, "total_memory", 0) // (1024 * 1024)
                gpus.append(GpuInfo(
                    name=name,
                    vram_mb=vram_mb,
                    backend="ascend",
                    device_index=i,
                    npu_info="torch_npu",
                ))
            return gpus
    except ImportError:
        pass

    # Fallback: /dev/davinci* device nodes (Atlas inference cards)
    import glob
    davinci_devs = sorted(glob.glob("/dev/davinci[0-9]*"))
    if davinci_devs:
        gpus = []
        for path in davinci_devs:
            idx_m = re.search(r"davinci(\d+)$", path)
            idx = int(idx_m.group(1)) if idx_m else len(gpus)
            gpus.append(GpuInfo(
                name=f"Huawei Ascend NPU (davinci{idx})",
                vram_mb=0,
                backend="ascend",
                device_index=idx,
                npu_info=path,
            ))
        return gpus

    return []


def _ascend_entry(info: dict, fallback_idx: int) -> GpuInfo:
    """Build a GpuInfo from parsed npu-smi key/value dict."""
    idx_str = info.get("index", str(fallback_idx))
    try:
        idx = int(idx_str)
    except ValueError:
        idx = fallback_idx

    # Model name: "chip name", "product name", "npu name"
    name = (
        info.get("chip name")
        or info.get("product name")
        or info.get("npu name")
        or info.get("name")
        or "Huawei Ascend NPU"
    )

    # VRAM: "hbm total memory (mb)" or "memory capacity (mb)"
    vram_mb = 0
    for key in ("hbm total memory (mb)", "memory capacity (mb)", "total memory (mb)"):
        val = info.get(key, "")
        try:
            vram_mb = int(float(val))
            break
        except (ValueError, TypeError):
            pass

    driver = info.get("driver version", info.get("driver", ""))

    return GpuInfo(
        name=name,
        vram_mb=vram_mb,
        driver=driver,
        backend="ascend",
        device_index=idx,
        npu_info=info.get("soc version", info.get("chip type", "")),
    )




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
    """Detect NPU presence (Qualcomm Hexagon, Intel NPU, Apple Neural Engine, Huawei Ascend)."""
    # Huawei Ascend / CANN
    if shutil.which("npu-smi") or shutil.which("ascend-dmi"):
        return True
    import glob as _glob
    if _glob.glob("/dev/davinci[0-9]*"):
        return True
    # Apple Silicon ANE
    if platform.system() == "Darwin" and platform.machine() == "arm64":
        return True
    # Windows NPU (Intel/Qualcomm)
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

    # Ordered by preference: NVIDIA > ROCm > Metal > DirectML > Ascend
    detectors: list[tuple[str, Any]] = [
        ("nvidia", _detect_nvidia),
        ("rocm", _detect_rocm),
        ("ascend", _detect_ascend),
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
