"""GitHub Actions workflow static analyzer."""

from __future__ import annotations

from typing import Any

import yaml

from app.analyzers.types import AnalyzerResult, Finding, RepoContext, Severity
from app.config import get_settings


def _safe_load(content: str) -> Any:
    return yaml.safe_load(content) or {}


def _collect_jobs(doc: Any) -> dict[str, Any]:
    if not isinstance(doc, dict):
        return {}
    jobs = doc.get("jobs")
    return jobs if isinstance(jobs, dict) else {}


async def run(ctx: RepoContext) -> AnalyzerResult:
    settings = get_settings()
    findings: list[Finding] = []
    summaries: list[dict[str, Any]] = []

    workflow_paths = sorted(
        p for p in ctx.files if p.startswith(".github/workflows/") and p.endswith((".yml", ".yaml"))
    )
    total_bytes = 0

    for path in workflow_paths:
        raw = ctx.files.get(path) or ""
        total_bytes += len(raw.encode("utf-8"))
        if total_bytes > settings.analyze_max_workflow_bytes:
            findings.append(
                Finding(
                    id="workflows-too-large",
                    category="ci",
                    severity=Severity.LOW,
                    title="Workflow YAML volume is large",
                    detail="Skipped deep inspection of remaining workflow files to stay within analysis limits.",
                    path=path,
                )
            )
            break

        doc = _safe_load(raw)
        jobs = _collect_jobs(doc)
        job_names = list(jobs.keys())
        steps_flat: list[str] = []
        checkout_count = 0
        setup_node = False
        has_cache = False
        unpinned: list[str] = []

        for jname, job in jobs.items():
            if not isinstance(job, dict):
                continue
            steps = job.get("steps")
            if not isinstance(steps, list):
                continue
            for step in steps:
                if not isinstance(step, dict):
                    continue
                uses = step.get("uses")
                if isinstance(uses, str):
                    steps_flat.append(uses)
                    if "actions/checkout" in uses:
                        checkout_count += 1
                    if "actions/setup-node" in uses:
                        setup_node = True
                    if "actions/cache" in uses or "actions/cache/" in uses:
                        has_cache = True
                    if uses.startswith("docker://"):
                        continue
                    if "/" in uses and "@" in uses:
                        _, ref = uses.rsplit("@", 1)
                        if ref in ("main", "master", "HEAD", "latest") or ref.startswith("${{"):
                            unpinned.append(uses)

        if unpinned:
            findings.append(
                Finding(
                    id=f"unpinned-actions-{path}",
                    category="ci",
                    severity=Severity.HIGH,
                    title="Unpinned or floating action refs",
                    detail=f"Pin actions to immutable SHAs or stable major tags. Floating refs: {', '.join(unpinned[:5])}",
                    path=path,
                    evidence={"refs": unpinned[:10]},
                )
            )

        if setup_node and not has_cache and ("npm" in raw or "yarn" in raw or "pnpm" in raw):
            findings.append(
                Finding(
                    id=f"missing-cache-{path}",
                    category="ci",
                    severity=Severity.MEDIUM,
                    title="Node install without obvious dependency cache",
                    detail="Add actions/cache or enable cache on setup-node to speed installs.",
                    path=path,
                )
            )

        if checkout_count > 2:
            findings.append(
                Finding(
                    id=f"redundant-checkout-{path}",
                    category="ci",
                    severity=Severity.LOW,
                    title="Multiple checkout steps in one workflow",
                    detail="Consider consolidating checkout usage to avoid redundant work unless intentional.",
                    path=path,
                    evidence={"checkout_steps": checkout_count},
                )
            )

        matrix = False
        for job in jobs.values():
            if isinstance(job, dict) and isinstance(job.get("strategy"), dict):
                matrix = bool((job["strategy"] or {}).get("matrix"))
        if matrix and "fail-fast: false" not in raw and "fail-fast:false" not in raw.replace(" ", ""):
            findings.append(
                Finding(
                    id=f"matrix-failfast-{path}",
                    category="ci",
                    severity=Severity.INFO,
                    title="Matrix builds may stop early",
                    detail="Consider strategy.fail-fast: false to see all matrix legs when diagnosing failures.",
                    path=path,
                )
            )

        summaries.append(
            {
                "path": path,
                "jobs": job_names[:20],
                "uses_sample": steps_flat[:12],
            }
        )

    if not workflow_paths and any("package.json" in p for p in ctx.tree_paths):
        findings.append(
            Finding(
                id="no-workflows",
                category="ci",
                severity=Severity.INFO,
                title="No workflow files fetched",
                detail="No .github/workflows YAML was available in the analyzed snapshot (may be absent or skipped).",
            )
        )

    return AnalyzerResult(
        analyzer="workflows",
        findings=findings,
        data={"workflows": summaries},
    )
