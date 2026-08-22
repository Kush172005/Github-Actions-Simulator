"""Orchestration engine for GitHub Actions run analysis.

Flow:
  1. Fetch run metadata + validate it is completed
  2. Fetch jobs (includes steps with conclusions)
  3. Select failed/cancelled jobs for log download (capped)
  4. Download targeted logs → strip ANSI → extract signals
  5. Build RepoContext at the run's head branch (for correlation)
  6. Run the existing static analyzers
  7. Build a structured, budget-aware payload for the AI
  8. Single LLM call → RunDiagnosis
  9. Return RunAnalyzeResponse
"""

from __future__ import annotations

import asyncio
import json
import re
from typing import Any

import httpx
import structlog

from app.ai.client import AIClient
from app.ai.sanitize import strip_ansi
from app.ai.schemas import RunDiagnosis
from app.analyzers.context_builder import build_repo_context
from app.analyzers.pipeline import run_pipeline
from app.analyzers.types import AnalyzerResult, RepoContext
from app.config import Settings, get_settings
from app.engines.log_extract import extract_log_signals
from app.schemas.run_analyze import (
    CorrelationOut,
    DiagnosisOut,
    JobOut,
    RunAnalyzeResponse,
    RunOut,
    StepOut,
)
from app.services.github_actions import (
    JobSlim,
    WorkflowRunSlim,
    download_job_logs,
    get_workflow_run,
    list_jobs_for_run,
)
from app.services.github_contents import GitHubRepoError

logger = structlog.get_logger(__name__)

_MAX_PAYLOAD_CHARS = 48_000       # AI user payload budget
_MAX_WORKFLOW_YAML_CHARS = 4_000  # How much YAML to include per workflow
_MAX_FILE_SAMPLE_CHARS = 2_000    # How much of each key file to include
_MAX_FILES_TOTAL_CHARS = 10_000   # Total key files budget
_MAX_FINDING_COUNT = 40           # Cap findings sent to AI


# ---------------------------------------------------------------------------
# Job/step serialisation for API response
# ---------------------------------------------------------------------------

def _job_to_out(job: JobSlim) -> JobOut:
    return JobOut(
        id=job.id,
        name=job.name,
        status=job.status,
        conclusion=job.conclusion,
        started_at=job.started_at,
        completed_at=job.completed_at,
        duration_seconds=job.duration_seconds,
        steps=[
            StepOut(
                name=s.name,
                number=s.number,
                status=s.status,
                conclusion=s.conclusion,
            )
            for s in job.steps
        ],
    )


def _run_to_out(run: WorkflowRunSlim) -> RunOut:
    return RunOut(
        id=run.id,
        name=run.name,
        head_branch=run.head_branch,
        head_sha=run.head_sha,
        event=run.event,
        status=run.status,
        conclusion=run.conclusion,
        html_url=run.html_url,
        created_at=run.created_at,
        updated_at=run.updated_at,
        run_number=run.run_number,
        workflow_path=run.path,
        duration_seconds=run.duration_seconds,
    )


# ---------------------------------------------------------------------------
# Deterministic correlation detection
# ---------------------------------------------------------------------------

def _detect_node_version_mismatch(
    workflow_yaml: str | None,
    pkg_json: str | None,
) -> dict[str, str] | None:
    """Return evidence dict if setup-node version differs from engines.node requirement."""
    if not workflow_yaml or not pkg_json:
        return None
    # Find node-version: in workflow YAML
    m = re.search(r"node-version:\s*['\"]?(\d+(?:\.\d+)*)['\"]?", workflow_yaml)
    if not m:
        return None
    workflow_node = m.group(1)

    # Find engines.node in package.json
    try:
        pkg = json.loads(pkg_json)
        required = (pkg.get("engines") or {}).get("node") or ""
        if not required:
            # Try volta
            required = (pkg.get("volta") or {}).get("node") or ""
    except (json.JSONDecodeError, AttributeError):
        return None

    if not required:
        return None

    # Simple mismatch heuristic: required has a constraint that excludes workflow's major
    major = int(workflow_node.split(".")[0])
    # Look for >=X.Y.Z or >X patterns
    lower_m = re.search(r"[>]=?\s*(\d+)", required)
    if lower_m:
        min_major = int(lower_m.group(1))
        if major < min_major:
            return {
                "workflow_node_version": workflow_node,
                "required_by_package_json": required,
            }
    return None


def _build_candidate_correlations(
    ctx: RepoContext,
    run: WorkflowRunSlim,
) -> list[dict[str, Any]]:
    """Deterministic pre-flight correlation hints for the AI payload."""
    hints: list[dict[str, Any]] = []

    # Workflow YAML for this run (try to match by path)
    wf_path = run.path.lstrip("/")
    workflow_yaml = ctx.files.get(wf_path)
    if not workflow_yaml:
        # Fallback: any workflow file if only one
        wf_files = {p: c for p, c in ctx.files.items() if p.startswith(".github/workflows/")}
        if len(wf_files) == 1:
            workflow_yaml = next(iter(wf_files.values()))

    pkg_json = ctx.files.get("package.json")
    mismatch = _detect_node_version_mismatch(workflow_yaml, pkg_json)
    if mismatch:
        hints.append({
            "type": "node_version_mismatch",
            "detail": (
                f"Workflow uses Node {mismatch['workflow_node_version']} "
                f"but package.json engines.node requires {mismatch['required_by_package_json']}"
            ),
            "evidence": mismatch,
        })

    return hints


# ---------------------------------------------------------------------------
# AI payload builder
# ---------------------------------------------------------------------------

def _key_file_samples(ctx: RepoContext, run: WorkflowRunSlim) -> dict[str, str]:
    """Collect key file contents in priority order, within char budget."""
    PRIORITY_FIRST = [
        run.path.lstrip("/"),  # the workflow that ran
    ]
    PRIORITY_SECOND = (
        "package.json",
        "requirements.txt",
        "pyproject.toml",
        "go.mod",
        "cargo.toml",
        "dockerfile",
    )
    seen: dict[str, str] = {}
    total = 0

    def _add(path: str) -> None:
        nonlocal total
        if path in seen or total >= _MAX_FILES_TOTAL_CHARS:
            return
        content = ctx.files.get(path, "")
        if not content:
            return
        # Prefer workflows in full; others capped
        cap = _MAX_WORKFLOW_YAML_CHARS if path.startswith(".github/workflows/") else _MAX_FILE_SAMPLE_CHARS
        snippet = content[:cap]
        if len(content) > cap:
            snippet += "\n… [truncated]"
        seen[path] = snippet
        total += len(snippet)

    for p in PRIORITY_FIRST:
        _add(p)

    for p in PRIORITY_SECOND:
        _add(p)

    # Any remaining workflow files
    for p in sorted(ctx.files.keys()):
        if p.startswith(".github/workflows/") and total < _MAX_FILES_TOTAL_CHARS:
            _add(p)

    return seen


def _findings_to_list(results: list[AnalyzerResult]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for res in results:
        for f in res.findings[:_MAX_FINDING_COUNT]:
            out.append({
                "id": f.id,
                "analyzer": res.analyzer,
                "severity": f.severity.value,
                "title": f.title,
                "detail": f.detail,
                "path": f.path,
            })
    return out[:_MAX_FINDING_COUNT]


def _build_ai_payload(
    run: WorkflowRunSlim,
    jobs: list[JobSlim],
    log_snippets: dict[str, str],
    logs_available: bool,
    ctx: RepoContext,
    results: list[AnalyzerResult],
    candidate_correlations: list[dict[str, Any]],
) -> str:
    """Build the JSON payload string for the AI. Respects char budget."""
    failed_jobs = [j.name for j in jobs if j.is_failed()]
    success_jobs = [j.name for j in jobs if j.conclusion == "success"]
    failed_steps = []
    for j in jobs:
        fs = j.failed_step()
        if fs:
            failed_steps.append({"job": j.name, "step": fs.name, "step_number": fs.number})

    # Compact job tree (skip runner_name to save space)
    jobs_compact = [
        {
            "name": j.name,
            "conclusion": j.conclusion,
            "steps": [
                {"number": s.number, "name": s.name, "conclusion": s.conclusion}
                for s in j.steps
            ],
        }
        for j in jobs
    ]

    payload: dict[str, Any] = {
        "run": {
            "id": run.id,
            "name": run.name,
            "conclusion": run.conclusion,
            "event": run.event,
            "branch": run.head_branch,
            "head_sha": run.head_sha[:10] if run.head_sha else "",
            "duration_seconds": run.duration_seconds,
            "workflow_path": run.path,
        },
        "jobs": jobs_compact,
        "failed_jobs": failed_jobs,
        "failed_steps": failed_steps,
        "succeeded_jobs": success_jobs,
        "log_snippets": log_snippets,
        "logs_available": logs_available,
        "candidate_correlations": candidate_correlations,
        "analyzer_findings": _findings_to_list(results),
        "key_file_contents": _key_file_samples(ctx, run),
        "repo_meta": {
            "full_name": ctx.full_name,
            "default_branch": ctx.default_branch,
            "language": (ctx.meta or {}).get("language"),
        },
    }

    raw = json.dumps(payload, ensure_ascii=False)
    if len(raw) > _MAX_PAYLOAD_CHARS:
        # Trim log snippets first (largest variable contributor)
        trimmed_snippets: dict[str, str] = {}
        budget = _MAX_PAYLOAD_CHARS // 3
        for job_name, snippet in log_snippets.items():
            trimmed_snippets[job_name] = snippet[:budget]
        payload["log_snippets"] = trimmed_snippets
        raw = json.dumps(payload, ensure_ascii=False)

    return raw[:_MAX_PAYLOAD_CHARS]


# ---------------------------------------------------------------------------
# Main orchestration
# ---------------------------------------------------------------------------

async def analyze_run(
    client: httpx.AsyncClient,
    owner: str,
    repo: str,
    run_id: int,
    access_token: str | None,
    ai_client: AIClient,
    settings: Settings | None = None,
) -> RunAnalyzeResponse:
    """Fetch, analyze, and diagnose a completed GitHub Actions run."""
    s = settings or get_settings()
    full_name = f"{owner}/{repo}"
    log_char_budget = s.analyze_max_ci_log_chars

    # 1. Fetch run + validate
    run = await get_workflow_run(client, owner, repo, run_id, access_token, s)
    if not run.is_completed():
        raise GitHubRepoError(
            "run_not_completed",
            f"Run #{run.run_number} is still {run.status} — only completed runs can be analyzed",
            400,
        )

    # 2. Fetch jobs (includes steps)
    jobs = await list_jobs_for_run(client, owner, repo, run_id, access_token, s)

    # 3. Select log targets: failed/cancelled/timed_out jobs first
    _FAILED_CONCLUSIONS = {"failure", "cancelled", "timed_out"}
    log_targets = [j for j in jobs if j.conclusion in _FAILED_CONCLUSIONS]
    if not log_targets and run.conclusion != "success":
        # Cancelled run with no failed jobs — grab first in-progress or all
        log_targets = jobs[:1]
    log_targets = log_targets[: s.actions_max_job_logs]

    # 4. Download logs concurrently
    logs_available = True
    log_snippets: dict[str, str] = {}

    if log_targets:
        log_results = await asyncio.gather(
            *[
                download_job_logs(client, owner, repo, j.id, access_token, s)
                for j in log_targets
            ],
            return_exceptions=True,
        )
        per_job_budget = max(log_char_budget // max(len(log_targets), 1), 10_000)
        any_expired = False
        for job, result in zip(log_targets, log_results, strict=False):
            if isinstance(result, Exception):
                logger.warning("log_download_failed", job=job.name, err=str(result))
                any_expired = True
                continue
            if result is None:
                any_expired = True
                continue
            clean = strip_ansi(result, per_job_budget * 2)
            snippet = extract_log_signals(clean, per_job_budget)
            if snippet:
                log_snippets[job.name] = snippet
        if any_expired and not log_snippets:
            logs_available = False

    # 5. Build repo context at the run's head SHA (exact commit that ran)
    ref_to_use = (run.head_sha or "").strip() or (run.head_branch or None)
    ctx: RepoContext | None = None
    results: list[AnalyzerResult] = []

    try:
        ctx = await build_repo_context(
            client, None, full_name, access_token, ref_to_use, s
        )
        results = await run_pipeline(ctx, client)
    except GitHubRepoError as e:
        if e.status_code == 404 and ref_to_use:
            # Commit/branch may be gone; retry with head_branch then default
            fallback = run.head_branch if ref_to_use != run.head_branch else None
            logger.info("run_context_ref_gone", ref=ref_to_use, fallback=fallback)
            try:
                ctx = await build_repo_context(
                    client, None, full_name, access_token, fallback, s
                )
                results = await run_pipeline(ctx, client)
            except Exception as ctx_err:
                logger.warning("run_context_fallback_failed", err=str(ctx_err))
                ctx = None
        else:
            logger.warning("run_context_failed", err=str(e))
            ctx = None
    except Exception as e:
        logger.warning("run_context_failed", err=str(e))
        ctx = None

    # 6. Build candidate correlations (deterministic)
    candidate_correlations: list[dict[str, Any]] = []
    if ctx is not None:
        candidate_correlations = _build_candidate_correlations(ctx, run)

    # 7. Build AI payload
    ai_payload = _build_ai_payload(
        run=run,
        jobs=jobs,
        log_snippets=log_snippets,
        logs_available=logs_available,
        ctx=ctx or RepoContext(
            owner=owner,
            repo=repo,
            full_name=full_name,
            default_branch="",
            resolved_branch="",
            commit_sha="",
            tree_paths=[],
            tree_truncated=False,
            files={},
            meta={},
        ),
        results=results,
        candidate_correlations=candidate_correlations,
    )

    # 8. AI call (graceful fallback on failure)
    diagnosis: RunDiagnosis | None = None
    ai_warning: str | None = None

    try:
        diagnosis = await ai_client.explain_run(full_name, ai_payload)
    except RuntimeError as e:
        logger.error("run_ai_failed", err=str(e))
        ai_warning = "AI diagnosis unavailable — structured job/step data is still shown."

    # 9. Build response
    diagnosis_out: DiagnosisOut | None = None
    what_worked: list[str] = []
    warnings: list[str] = []
    correlations: list[CorrelationOut] = []

    if diagnosis:
        diagnosis_out = DiagnosisOut(
            root_cause=diagnosis.root_cause,
            explanation=diagnosis.explanation,
            fix=diagnosis.fix,
            confidence=diagnosis.confidence,
            affected_job=diagnosis.affected_job,
            affected_step=diagnosis.affected_step,
        )
        what_worked = diagnosis.what_worked
        warnings = diagnosis.warnings
        correlations = [
            CorrelationOut(title=c.title, detail=c.detail, evidence=c.evidence)
            for c in (diagnosis.correlations or [])
        ]
    elif log_targets:
        # Fallback: derive what_worked deterministically
        what_worked = [j.name for j in jobs if j.conclusion == "success"]

    return RunAnalyzeResponse(
        repository=full_name,
        run_id=run_id,
        run=_run_to_out(run),
        jobs=[_job_to_out(j) for j in jobs],
        diagnosis=diagnosis_out,
        what_worked=what_worked,
        warnings=warnings,
        correlations=correlations,
        logs_available=logs_available,
        ai_warning=ai_warning,
    )
