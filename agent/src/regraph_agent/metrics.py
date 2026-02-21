"""Real-time system metrics for heartbeat reports."""

from __future__ import annotations

import psutil


def collect() -> dict:
    """Collect current system metrics."""
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")

    metrics: dict = {
        "cpu_percent": psutil.cpu_percent(interval=0.3),
        "memory_used_mb": int(mem.used / (1024 * 1024)),
        "memory_total_mb": int(mem.total / (1024 * 1024)),
        "memory_percent": mem.percent,
        "disk_used_gb": round(disk.used / (1024**3), 1),
        "disk_total_gb": round(disk.total / (1024**3), 1),
    }

    # GPU metrics (NVIDIA)
    try:
        import GPUtil  # type: ignore
        gpus = GPUtil.getGPUs()
        if gpus:
            metrics["gpus"] = [
                {
                    "id": g.id,
                    "name": g.name,
                    "load_percent": round(g.load * 100, 1),
                    "memory_used_mb": int(g.memoryUsed),
                    "memory_total_mb": int(g.memoryTotal),
                    "temperature_c": g.temperature,
                }
                for g in gpus
            ]
    except ImportError:
        pass

    return metrics
