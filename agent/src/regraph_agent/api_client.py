"""HTTP client for communicating with the ReGraph platform API."""

from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger("regraph.api")


class APIError(Exception):
    def __init__(self, status: int, detail: str):
        self.status = status
        self.detail = detail
        super().__init__(f"API error {status}: {detail}")


class ReGraphAPI:
    """Thin wrapper around the ReGraph platform API."""

    def __init__(self, base_url: str, connection_key: str, agent_version: str):
        self._base = base_url.rstrip("/")
        self._key = connection_key
        self._version = agent_version
        self._client = httpx.Client(
            base_url=self._base,
            headers={
                "Authorization": f"Bearer {self._key}",
                "User-Agent": f"regraph-agent/{self._version}",
                "Content-Type": "application/json",
            },
            timeout=httpx.Timeout(30, connect=10),
        )

    # ── Device registration ───────────────────────────────
    def register_device(self, hardware: dict) -> dict:
        """Register or re-register this device with the network."""
        return self._post("/v1/provider/register", json={
            "connection_key": self._key,
            "hardware": hardware,
            "agent_version": self._version,
        })

    # ── Heartbeat ─────────────────────────────────────────
    def heartbeat(self, device_id: str, metrics: dict) -> dict:
        """Send a heartbeat with current resource metrics."""
        return self._post(f"/v1/provider/devices/{device_id}/heartbeat", json={
            "metrics": metrics,
        })

    # ── Task management ───────────────────────────────────
    def poll_task(self, device_id: str) -> dict | None:
        """Poll for a new task. Returns None if no task available."""
        resp = self._get(f"/v1/provider/devices/{device_id}/task")
        if resp.get("task") is None:
            return None
        return resp["task"]

    def submit_result(self, device_id: str, task_id: str, result: dict) -> dict:
        """Submit completed task results."""
        return self._post(f"/v1/provider/devices/{device_id}/tasks/{task_id}/result", json=result)

    def report_failure(self, device_id: str, task_id: str, error: str) -> dict:
        """Report a task failure."""
        return self._post(f"/v1/provider/devices/{device_id}/tasks/{task_id}/failure", json={
            "error": error,
        })

    # ── Version check ─────────────────────────────────────
    def check_update(self) -> dict | None:
        """Check if a newer agent version is available."""
        resp = self._get("/v1/provider/agent/latest")
        latest = resp.get("version", self._version)
        if latest != self._version:
            return resp
        return None

    # ── Internal ──────────────────────────────────────────
    def _get(self, path: str, **kwargs: Any) -> dict:
        r = self._client.get(path, **kwargs)
        return self._handle(r)

    def _post(self, path: str, **kwargs: Any) -> dict:
        r = self._client.post(path, **kwargs)
        return self._handle(r)

    @staticmethod
    def _handle(r: httpx.Response) -> dict:
        if r.status_code >= 400:
            detail = r.text[:500]
            try:
                detail = r.json().get("error", detail)
            except Exception:
                pass
            raise APIError(r.status_code, detail)
        return r.json()

    def close(self) -> None:
        self._client.close()
