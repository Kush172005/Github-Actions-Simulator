from __future__ import annotations

import asyncio
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.ai.client import AIClient
from app.analyzers.context_builder import build_repo_context
from app.analyzers.pipeline import run_pipeline
from app.config import get_settings
from app.dependencies import get_current_user_doc
from app.engines import insight_engine, log_engine
from app.engines.scoring import compute_score_and_risk
from app.schemas.analyze import (
    AnalyzeRequest,
    AnalyzeResponse,
    AnalyzerOut,
    FindingOut,
    FixOut,
    InsightOut,
    LogExplanationOut,
    SetupOut,
)
from app.services.github_contents import GitHubRepoError

logger = structlog.get_logger(__name__)

router = APIRouter(tags=["analyze"])


def _ai_configured() -> bool:
    s = get_settings()
    has_or = bool((s.openrouter_api_key or "").strip())
    has_hf = bool((s.huggingface_api_key or "").strip())
    return has_or or has_hf


def _to_analyzer_out(results) -> list[AnalyzerOut]:
    out: list[AnalyzerOut] = []
    for res in results:
        findings = [
            FindingOut(
                id=f.id,
                category=f.category,
                severity=f.severity.value,
                title=f.title,
                detail=f.detail,
                path=f.path,
                evidence=f.evidence,
            )
            for f in res.findings
        ]
        out.append(AnalyzerOut(analyzer=res.analyzer, findings=findings, data=res.data))
    return out


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_repo(
    request: Request,
    body: AnalyzeRequest,
    user: Annotated[dict, Depends(get_current_user_doc)],
):
    if not _ai_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "AI is not configured — set OPENROUTER_API_KEY (free at openrouter.ai/keys) "
                "or HUGGINGFACE_API_KEY in your .env file"
            ),
        )

    client = getattr(request.app.state, "http_client", None)
    if client is None:
        raise HTTPException(status_code=500, detail="HTTP client not initialized")

    token = user.get("github_access_token")

    try:
        ctx = await build_repo_context(
            client,
            body.repo_url,
            body.full_name,
            token,
            body.ref,
        )
    except GitHubRepoError as e:
        logger.warning("analyze_github_error", code=e.code, status=e.status_code)
        raise HTTPException(status_code=e.status_code or 400, detail=e.message) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    try:
        results = await run_pipeline(ctx, client)
    except Exception as e:
        logger.exception("analyze_pipeline_failed", err=str(e))
        raise HTTPException(status_code=502, detail="Analyzer pipeline failed") from e

    health_score, risk_level = compute_score_and_risk(results)
    ai = AIClient()

    try:
        if body.ci_logs and body.ci_logs.strip():
            insights, log_exp = await asyncio.gather(
                insight_engine.generate_insights(ctx, results, ai),
                log_engine.explain_logs(ctx.full_name, body.ci_logs, ai),
            )
        else:
            insights = await insight_engine.generate_insights(ctx, results, ai)
            log_exp = None
    except RuntimeError as e:
        logger.error("analyze_ai_failed", err=str(e))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI generation failed: {e}",
        ) from e

    analyzers_out = _to_analyzer_out(results)

    return AnalyzeResponse(
        repository=ctx.full_name,
        default_branch=ctx.default_branch,
        resolved_branch=ctx.resolved_branch,
        commit_sha=ctx.commit_sha,
        health_score=health_score,
        risk_level=risk_level,
        analyzers=analyzers_out,
        insights=[
            InsightOut(title=i.title, explanation=i.explanation, category=i.category)
            for i in insights.insights
        ],
        fix_suggestions=[
            FixOut(
                problem=f.problem,
                impact=f.impact,
                exact_fix=f.exact_fix,
                priority=f.priority,
                reasoning=f.reasoning,
            )
            for f in insights.fix_suggestions
        ],
        setup_guide=[
            SetupOut(title=s.title, command=s.command, notes=s.notes) for s in insights.setup_guide
        ],
        log_explanation=(
            LogExplanationOut(
                root_cause=log_exp.root_cause,
                explanation=log_exp.explanation,
                fix=log_exp.fix,
                confidence=log_exp.confidence,
            )
            if log_exp
            else None
        ),
    )
