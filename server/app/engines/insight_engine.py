"""Turn analyzer outputs into validated insight bundles via LLM.

Key enrichments over the previous version:
- Sends rich repo metadata: private flag, stars, forks, open issues, topics, description, license,
  created_at, pushed_at (so the model knows if repo is active/stale, public/private, popular/hobby).
- Sends actual file content samples for key files (workflows, package.json, requirements.txt) so
  the model can reason about the real code rather than just file names.
- Flags context to the model (e.g. is_private) so it tailors advice appropriately.
"""

from __future__ import annotations

import json

from app.ai.client import AIClient
from app.ai.prompts import INSIGHT_SYSTEM, insight_user_payload
from app.ai.schemas import InsightBundle
from app.analyzers.types import AnalyzerResult, RepoContext


def _finding_to_dict(res: AnalyzerResult) -> dict:
    return {
        "analyzer": res.analyzer,
        "findings": [
            {
                "id": f.id,
                "category": f.category,
                "severity": f.severity.value,
                "title": f.title,
                "detail": f.detail,
                "path": f.path,
                "evidence": f.evidence,
            }
            for f in res.findings[:80]
        ],
        "data": res.data,
    }


def _key_file_samples(ctx: RepoContext, max_chars_per_file: int = 2000) -> dict[str, str]:
    """Return a curated dict of filename -> content for the most insightful files.

    Budget-conscious: we intentionally keep each file short so the model has
    enough output-token headroom to generate a complete JSON response.
    We prioritize workflow YAMLs (CI/security insight), then manifests.
    """
    PRIORITY_SUFFIXES = (
        ".github/workflows/",
        "package.json",
        "requirements.txt",
        "pyproject.toml",
        "dockerfile",
        "docker-compose.yml",
        "docker-compose.yaml",
        ".env.example",
        ".env.sample",
        "go.mod",
        "cargo.toml",
    )

    samples: dict[str, str] = {}
    total_chars = 0
    max_total = 12_000  # Keep payload lean so the model has headroom for output tokens

    # Sort so workflows come first
    sorted_paths = sorted(
        ctx.files.keys(),
        key=lambda p: (
            0 if p.startswith(".github/workflows/") else
            1 if any(p.lower().endswith(s) or p.lower() == s for s in PRIORITY_SUFFIXES) else
            2
        )
    )

    for path in sorted_paths:
        if total_chars >= max_total:
            break
        content = ctx.files.get(path, "")
        if not content:
            continue
        truncated = content[:max_chars_per_file]
        if len(content) > max_chars_per_file:
            truncated += "\n…[file truncated for analysis]"
        samples[path] = truncated
        total_chars += len(truncated)

    return samples


def build_analyzer_payload(
    ctx: RepoContext,
    results: list[AnalyzerResult],
    max_chars: int = 80_000,
) -> str:
    """Build the full analysis payload to send to the LLM.

    Includes:
    - Repository metadata (visibility, activity, popularity, topics)
    - Static analyzer findings (all categories)
    - File tree sample (so the model understands the project structure at a glance)
    - Key file contents (workflows, manifests — what matters most for real insights)
    """
    meta = ctx.meta

    payload = {
        # --- Core identity ---
        "repository": ctx.full_name,
        "default_branch": ctx.default_branch,
        "resolved_branch": ctx.resolved_branch,
        "commit": ctx.commit_sha,

        # --- Visibility & activity signals (critical for tailoring advice) ---
        "is_private": bool(meta.get("private")),
        "description": meta.get("description") or "",
        "topics": meta.get("topics") or [],
        "language": meta.get("language"),
        "license": (meta.get("license") or {}).get("spdx_id") or None,
        "created_at": meta.get("created_at"),
        "pushed_at": meta.get("pushed_at"),   # stale = pushed long ago

        # --- Popularity / maturity signals ---
        "stargazers_count": meta.get("stargazers_count") or 0,
        "forks_count": meta.get("forks_count") or 0,
        "open_issues_count": meta.get("open_issues_count") or 0,
        "subscribers_count": meta.get("subscribers_count") or 0,
        "has_wiki": bool(meta.get("has_wiki")),
        "has_discussions": bool(meta.get("has_discussions")),
        "has_projects": bool(meta.get("has_projects")),
        "archived": bool(meta.get("archived")),
        "fork": bool(meta.get("fork")),

        # --- Tree summary ---
        "tree_truncated": ctx.tree_truncated,
        "total_file_count": len(ctx.tree_paths),
        "sample_paths": ctx.tree_paths[:300],  # structure visible to model (trimmed for output budget)

        # --- Static analyzer results (the core findings) ---
        "analyzers": [_finding_to_dict(r) for r in results],

        # --- Key file contents for deep analysis ---
        "key_file_contents": _key_file_samples(ctx),
    }

    raw = json.dumps(payload, ensure_ascii=False)
    if len(raw) > max_chars:
        # First trim: reduce file contents
        payload["key_file_contents"] = {
            k: v[:600] + "\n…[trimmed]" for k, v in payload["key_file_contents"].items()
        }
        payload["sample_paths"] = ctx.tree_paths[:150]
        raw = json.dumps(payload, ensure_ascii=False)
        if len(raw) > max_chars:
            raw = raw[: max_chars - 30] + '…[payload truncated]"}'

    return raw


async def generate_insights(
    ctx: RepoContext, results: list[AnalyzerResult], client: AIClient
) -> InsightBundle:
    # Use a lower max_chars for OpenRouter to ensure model has output headroom
    payload = build_analyzer_payload(ctx, results, max_chars=50_000)
    return await client.generate_insights(ctx.full_name, ctx.resolved_branch, payload)
