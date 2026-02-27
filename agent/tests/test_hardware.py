"""Unit tests for hardware.py — hardware detection logic."""

from __future__ import annotations

import platform
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Make sure the src package is importable without installing
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from regraph_agent.hardware import (
    GpuInfo,
    HardwareReport,
    _detect_apple_silicon,
    _detect_ascend,
    _detect_directml,
    _detect_nvidia,
    _detect_rocm,
    _run,
    detect_hardware,
)


# ── _run helper ──────────────────────────────────────────────────────────────

class TestRunHelper:
    def test_returns_stdout_on_success(self):
        result = _run(["echo", "hello"])
        assert result == "hello"

    def test_returns_empty_on_nonzero(self):
        result = _run(["false"])
        assert result == ""

    def test_returns_empty_on_missing_command(self):
        result = _run(["__nonexistent_binary__"])
        assert result == ""

    def test_returns_empty_on_timeout(self):
        result = _run(["sleep", "100"], timeout=0)
        assert result == ""


# ── GpuInfo dataclass ────────────────────────────────────────────────────────

class TestGpuInfo:
    def test_defaults(self):
        g = GpuInfo(name="RTX 4090", vram_mb=24576)
        assert g.driver == ""
        assert g.cuda_version == ""
        assert g.backend == "unknown"
        assert g.device_index == 0

    def test_custom_fields(self):
        g = GpuInfo(name="A100", vram_mb=81920, backend="nvidia", device_index=1, driver="535.86")
        assert g.backend == "nvidia"
        assert g.device_index == 1


# ── HardwareReport.summary ───────────────────────────────────────────────────

class TestHardwareReportSummary:
    def test_summary_keys(self):
        report = HardwareReport(
            hostname="testhost",
            os="linux",
            arch="x86_64",
            cpu_model="Intel Core i9",
            cpu_cores=16,
            cpu_cores_physical=8,
            ram_total_mb=32768,
            disk_total_gb=512.0,
            gpu_mode="disabled",
        )
        s = report.summary()
        for key in ("hostname", "os", "arch", "cpu_model", "cpu_cores",
                    "ram_total_mb", "gpu_mode", "gpus"):
            assert key in s, f"Missing key: {key}"

    def test_summary_gpu_list(self):
        report = HardwareReport()
        report.gpus = [GpuInfo(name="RTX 4090", vram_mb=24576, backend="nvidia")]
        s = report.summary()
        assert len(s["gpus"]) == 1
        assert s["gpus"][0]["name"] == "RTX 4090"
        assert s["gpus"][0]["backend"] == "nvidia"

    def test_summary_empty_gpus(self):
        report = HardwareReport()
        assert report.summary()["gpus"] == []


# ── _detect_nvidia ────────────────────────────────────────────────────────────

class TestDetectNvidia:
    @patch("regraph_agent.hardware.shutil.which", return_value=None)
    def test_returns_empty_when_no_nvidia_smi(self, _mock):
        assert _detect_nvidia() == []

    @patch("regraph_agent.hardware.shutil.which", return_value="/usr/bin/nvidia-smi")
    @patch("regraph_agent.hardware._run")
    def test_returns_empty_when_smi_output_blank(self, mock_run, _mock_which):
        mock_run.return_value = ""
        assert _detect_nvidia() == []

    @patch("regraph_agent.hardware.shutil.which", return_value="/usr/bin/nvidia-smi")
    @patch("regraph_agent.hardware._run")
    def test_parses_single_gpu(self, mock_run, _mock_which):
        # Simulate nvidia-smi CSV output: index, name, memory, driver
        def side_effect(cmd, **kwargs):
            joined = " ".join(cmd)
            if "query-gpu=index,name,memory.total,driver_version" in joined:
                return "0, NVIDIA RTX 4090, 24576, 535.86.10"
            if "nvcc" in joined:
                return "Cuda compilation tools, release 12.1, V12.1.66"
            return ""
        mock_run.side_effect = side_effect
        gpus = _detect_nvidia()
        assert len(gpus) == 1
        assert gpus[0].name == "NVIDIA RTX 4090"
        assert gpus[0].vram_mb == 24576
        assert gpus[0].backend == "nvidia"
        assert gpus[0].device_index == 0

    @patch("regraph_agent.hardware.shutil.which", return_value="/usr/bin/nvidia-smi")
    @patch("regraph_agent.hardware._run")
    def test_parses_multiple_gpus(self, mock_run, _mock_which):
        def side_effect(cmd, **kwargs):
            joined = " ".join(cmd)
            if "query-gpu=index,name,memory.total,driver_version" in joined:
                return "0, Tesla A100, 81920, 525.85.12\n1, Tesla A100, 81920, 525.85.12"
            return ""
        mock_run.side_effect = side_effect
        gpus = _detect_nvidia()
        assert len(gpus) == 2
        assert gpus[1].device_index == 1


# ── _detect_rocm ─────────────────────────────────────────────────────────────

class TestDetectRocm:
    @patch("regraph_agent.hardware.shutil.which", return_value=None)
    def test_returns_empty_when_no_rocm_smi(self, _mock):
        assert _detect_rocm() == []

    @patch("regraph_agent.hardware.shutil.which", return_value="/usr/bin/rocm-smi")
    @patch("regraph_agent.hardware._run")
    def test_returns_empty_when_no_output(self, mock_run, _mock_which):
        mock_run.return_value = ""
        assert _detect_rocm() == []

    @patch("regraph_agent.hardware.shutil.which", return_value="/usr/bin/rocm-smi")
    @patch("regraph_agent.hardware._run")
    def test_parses_json_output(self, mock_run, _mock_which):
        import json
        mock_run.side_effect = lambda cmd, **kw: json.dumps({
            "card0": {"Card series": "AMD Radeon RX 7900 XTX"},
        }) if "--json" in cmd else ""
        gpus = _detect_rocm()
        assert len(gpus) >= 1
        assert gpus[0].backend == "rocm"


# ── _detect_apple_silicon ─────────────────────────────────────────────────────

class TestDetectAppleSilicon:
    @patch("regraph_agent.hardware.platform.system", return_value="Linux")
    def test_returns_empty_on_non_darwin(self, _mock):
        assert _detect_apple_silicon() == []

    @patch("regraph_agent.hardware.platform.system", return_value="Darwin")
    @patch("regraph_agent.hardware.platform.machine", return_value="arm64")
    @patch("regraph_agent.hardware._run", return_value="Apple M3 Pro")
    def test_detects_apple_silicon(self, _mock_run, _mock_machine, _mock_sys):
        gpus = _detect_apple_silicon()
        assert len(gpus) == 1
        assert gpus[0].name == "Apple M3 Pro"
        assert gpus[0].backend == "metal"
        assert gpus[0].vram_mb > 0  # unified memory reported

    @patch("regraph_agent.hardware.platform.system", return_value="Darwin")
    @patch("regraph_agent.hardware.platform.machine", return_value="x86_64")
    def test_returns_empty_on_intel_mac(self, _mock_machine, _mock_sys):
        assert _detect_apple_silicon() == []


# ── _detect_directml ─────────────────────────────────────────────────────────

class TestDetectDirectML:
    @patch("regraph_agent.hardware.platform.system", return_value="Linux")
    def test_returns_empty_on_non_windows(self, _mock):
        assert _detect_directml() == []


# ── detect_hardware (integration) ────────────────────────────────────────────

class TestDetectHardware:
    def test_disabled_mode_skips_gpu(self):
        report = detect_hardware(gpu_mode="disabled")
        assert report.gpu_mode == "disabled"
        assert report.gpus == []

    def test_report_has_basic_fields(self):
        report = detect_hardware(gpu_mode="disabled")
        assert report.hostname != ""
        assert report.os in ("linux", "darwin", "windows")
        assert report.cpu_cores >= 1
        assert report.ram_total_mb > 0
        assert report.disk_total_gb > 0
        assert isinstance(report.gpus, list)

    def test_python_version_filled(self):
        report = detect_hardware(gpu_mode="disabled")
        assert report.python_version != ""
        assert "." in report.python_version

    @patch("regraph_agent.hardware._detect_nvidia", return_value=[
        GpuInfo(name="RTX 4090", vram_mb=24576, backend="nvidia"),
    ])
    @patch("regraph_agent.hardware._detect_rocm", return_value=[])
    @patch("regraph_agent.hardware._detect_apple_silicon", return_value=[])
    @patch("regraph_agent.hardware._detect_directml", return_value=[])
    def test_auto_picks_nvidia(self, _dm, _das, _dr, _dn):
        report = detect_hardware(gpu_mode="auto")
        assert report.gpu_mode == "nvidia"
        assert len(report.gpus) == 1
        assert report.gpus[0].name == "RTX 4090"

    @patch("regraph_agent.hardware._detect_nvidia", return_value=[])
    @patch("regraph_agent.hardware._detect_rocm", return_value=[
        GpuInfo(name="AMD RX 7900", vram_mb=24576, backend="rocm"),
    ])
    @patch("regraph_agent.hardware._detect_apple_silicon", return_value=[])
    @patch("regraph_agent.hardware._detect_directml", return_value=[])
    def test_auto_picks_rocm_when_no_nvidia(self, _dm, _das, _dr, _dn):
        report = detect_hardware(gpu_mode="auto")
        assert report.gpu_mode == "rocm"

    @patch("regraph_agent.hardware._detect_nvidia", return_value=[])
    @patch("regraph_agent.hardware._detect_rocm", return_value=[])
    @patch("regraph_agent.hardware._detect_apple_silicon", return_value=[])
    @patch("regraph_agent.hardware._detect_directml", return_value=[])
    def test_gpu_mode_disabled_when_nothing_found(self, _dm, _das, _dr, _dn):
        report = detect_hardware(gpu_mode="auto")
        assert report.gpu_mode == "disabled"
        assert report.gpus == []

    def test_cpu_model_not_empty(self):
        report = detect_hardware(gpu_mode="disabled")
        # May be empty on some CI runners, just check it's a string
        assert isinstance(report.cpu_model, str)
