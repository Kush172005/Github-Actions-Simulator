"""Turn analyzer outputs into validated insight bundles via LLM."""

from __future__ import annotations

import json

from app.ai.client import AIClient
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


def build_analyzer_payload(ctx: RepoContext, results: list[AnalyzerResult], max_chars: int = 48_000) -> str:
    payload = {
        "repository": ctx.full_name,
        "default_branch": ctx.default_branch,
        "resolved_branch": ctx.resolved_branch,
        "commit": ctx.commit_sha,
        "tree_truncated": ctx.tree_truncated,
        "language": ctx.meta.get("language"),
        "stars": ctx.meta.get("stargazers_count"),
        "analyzers": [_finding_to_dict(r) for r in results],
        "sample_paths": ctx.tree_paths[:400],
    }
    raw = json.dumps(payload, ensure_ascii=False)
    if len(raw) > max_chars:
        raw = raw[: max_chars - 20] + "…[truncated]"
    return raw


async def generate_insights(ctx: RepoContext, results: list[AnalyzerResult], client: AIClient) -> InsightBundle:
    payload = build_analyzer_payload(ctx, results)
    return await client.generate_insights(ctx.full_name, ctx.resolved_branch, payload)
