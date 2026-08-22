"""GitHub Actions REST helpers — workflow runs, jobs, steps, and job log download."""

from __future__ import annotations

import io
import zipfile
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import httpx
import structlog

from app.config import Settings, get_settings
from app.services.github_contents import GitHubRepoError, _headers, _map_httpx_error

logger = structlog.get_logger(__name__)


# ---------------------------------------------------------------------------
# Lightweight data classes (no Pydantic overhead for internal types)
# ---------------------------------------------------------------------------

@dataclass
class StepSlim:
    name: str
    status: str
    conclusion: str | None
    number: int


@dataclass
class JobSlim:
    id: int
    name: str
    status: str
    conclusion: str | None
    started_at: str | None
    completed_at: str | None
    steps: list[StepSlim] = field(default_factory=list)
    runner_name: str | None = None

    @property
    def duration_seconds(self) -> int | None:
        if not self.started_at or not self.completed_at:
            return None
        try:
            start = datetime.fromisoformat(self.started_at.replace("Z", "+00:00"))
            end = datetime.fromisoformat(self.completed_at.replace("Z", "+00:00"))
            return max(0, int((end - start).total_seconds()))
        except Exception:
            return None

    def is_failed(self) -> bool:
        return self.conclusion in ("failure", "cancelled", "timed_out")

    def failed_step(self) -> StepSlim | None:
        for s in self.steps:
            if s.conclusion in ("failure", "cancelled", "timed_out"):
                return s
        return None


@dataclass
class WorkflowRunSlim:
    id: int
    name: str
    workflow_id: int
    head_branch: str
    head_sha: str
    event: str
    status: str
    conclusion: str | None
    html_url: str
    created_at: str
    updated_at: str
    run_number: int
    run_attempt: int
    path: str  # workflow file path, e.g. ".github/workflows/ci.yml"

    @property
    def duration_seconds(self) -> int | None:
        if not self.created_at or not self.updated_at:
            return None
        try:
            start = datetime.fromisoformat(self.created_at.replace("Z", "+00:00"))
            end = datetime.fromisoformat(self.updated_at.replace("Z", "+00:00"))
            return max(0, int((end - start).total_seconds()))
        except Exception:
            return None

    def is_completed(self) -> bool:
        return self.status == "completed"


# ---------------------------------------------------------------------------
# Parsers
# ---------------------------------------------------------------------------

def _parse_step(raw: dict[str, Any]) -> StepSlim:
    return StepSlim(
        name=raw.get("name") or "",
        status=raw.get("status") or "",
        conclusion=raw.get("conclusion"),
        number=raw.get("number") or 0,
    )


def _parse_job(raw: dict[str, Any]) -> JobSlim:
    steps = [_parse_step(s) for s in (raw.get("steps") or [])]
    return JobSlim(
        id=raw["id"],
        name=raw.get("name") or "",
        status=raw.get("status") or "",
        conclusion=raw.get("conclusion"),
        started_at=raw.get("started_at"),
        completed_at=raw.get("completed_at"),
        steps=steps,
        runner_name=raw.get("runner_name"),
    )


def _parse_run(raw: dict[str, Any]) -> WorkflowRunSlim:
    return WorkflowRunSlim(
        id=raw["id"],
        name=raw.get("name") or raw.get("display_title") or "",
        workflow_id=raw.get("workflow_id") or 0,
        head_branch=raw.get("head_branch") or "",
        head_sha=raw.get("head_sha") or "",
        event=raw.get("event") or "",
        status=raw.get("status") or "",
        conclusion=raw.get("conclusion"),
        html_url=raw.get("html_url") or "",
        created_at=raw.get("created_at") or "",
        updated_at=raw.get("updated_at") or "",
        run_number=raw.get("run_number") or 0,
        run_attempt=raw.get("run_attempt") or 1,
        path=raw.get("path") or "",
    )


# ---------------------------------------------------------------------------
# API functions
# ---------------------------------------------------------------------------

async def list_workflow_runs(
    client: httpx.AsyncClient,
    owner: str,
    repo: str,
    access_token: str | None,
    page: int = 1,
    settings: Settings | None = None,
) -> tuple[list[WorkflowRunSlim], int, int]:
    """Fetch a page of workflow runs (most recent first).

    Returns (runs, total_count, per_page).
    """
    s = settings or get_settings()
    per_page = max(1, min(int(s.actions_runs_per_page), 100))
    page = max(1, int(page))
    url = f"https://api.github.com/repos/{owner}/{repo}/actions/runs"
    try:
        r = await client.get(
            url,
            params={"per_page": str(per_page), "page": str(page)},
            headers=_headers(access_token),
            timeout=s.github_analyze_timeout_s,
        )
        r.raise_for_status()
        data = r.json()
        runs = data.get("workflow_runs") or []
        total_count = int(data.get("total_count") or 0)
        return [_parse_run(run) for run in runs], total_count, per_page
    except httpx.HTTPStatusError as e:
        raise _map_httpx_error(e) from e


async def get_workflow_run(
    client: httpx.AsyncClient,
    owner: str,
    repo: str,
    run_id: int,
    access_token: str | None,
    settings: Settings | None = None,
) -> WorkflowRunSlim:
    """Fetch a single workflow run by ID."""
    s = settings or get_settings()
    url = f"https://api.github.com/repos/{owner}/{repo}/actions/runs/{run_id}"
    try:
        r = await client.get(url, headers=_headers(access_token), timeout=s.github_analyze_timeout_s)
        r.raise_for_status()
        return _parse_run(r.json())
    except httpx.HTTPStatusError as e:
        raise _map_httpx_error(e) from e


async def list_jobs_for_run(
    client: httpx.AsyncClient,
    owner: str,
    repo: str,
    run_id: int,
    access_token: str | None,
    settings: Settings | None = None,
) -> list[JobSlim]:
    """Fetch all jobs (including steps) for a run. Returns latest attempt per job."""
    s = settings or get_settings()
    url = f"https://api.github.com/repos/{owner}/{repo}/actions/runs/{run_id}/jobs"
    try:
        r = await client.get(
            url,
            params={"filter": "latest", "per_page": "100"},
            headers=_headers(access_token),
            timeout=s.github_analyze_timeout_s,
        )
        r.raise_for_status()
        data = r.json()
        jobs = data.get("jobs") or []
        return [_parse_job(j) for j in jobs]
    except httpx.HTTPStatusError as e:
        raise _map_httpx_error(e) from e


async def download_job_logs(
    client: httpx.AsyncClient,
    owner: str,
    repo: str,
    job_id: int,
    access_token: str | None,
    settings: Settings | None = None,
) -> str | None:
    """Download text logs for a specific job.

    Returns None when logs have expired (GitHub retains them for 90 days).
    The response may be a zip archive — we unpack it transparently.
    """
    s = settings or get_settings()
    max_bytes = s.actions_max_log_archive_bytes
    url = f"https://api.github.com/repos/{owner}/{repo}/actions/jobs/{job_id}/logs"
    try:
        r = await client.get(
            url,
            headers=_headers(access_token),
            timeout=s.github_analyze_timeout_s,
            follow_redirects=True,
        )
        if r.status_code == 404:
            logger.info("job_logs_expired", job_id=job_id)
            return None
        r.raise_for_status()

        raw_bytes = r.content
        if len(raw_bytes) > max_bytes:
            logger.warning("job_logs_oversized", job_id=job_id, bytes=len(raw_bytes))
            raw_bytes = raw_bytes[:max_bytes]

        # GitHub job logs via redirect are typically plain text, not zip.
        # The run-level zip endpoint is different; guard anyway.
        content_type = r.headers.get("content-type", "")
        if "zip" in content_type or (len(raw_bytes) >= 2 and raw_bytes[:2] == b"PK"):
            return _unzip_logs(raw_bytes)
        return raw_bytes.decode("utf-8", errors="replace")

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            return None
        raise _map_httpx_error(e) from e


def _unzip_logs(data: bytes) -> str:
    """Extract all text entries from a zip archive and concatenate."""
    try:
        buf = io.BytesIO(data)
        parts: list[str] = []
        with zipfile.ZipFile(buf) as zf:
            for name in sorted(zf.namelist()):
                if name.endswith("/"):
                    continue
                try:
                    content = zf.read(name).decode("utf-8", errors="replace")
                    parts.append(f"=== {name} ===\n{content}")
                except Exception:
                    pass
        return "\n".join(parts)
    except zipfile.BadZipFile:
        return data.decode("utf-8", errors="replace")
