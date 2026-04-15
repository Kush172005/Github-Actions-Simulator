"""Run all analyzers concurrently."""

from __future__ import annotations

import asyncio

import httpx

from app.analyzers import dependencies as deps_analyzer
from app.analyzers import repo_structure
from app.analyzers import workflows as wf_analyzer
from app.analyzers.types import AnalyzerResult, RepoContext


async def run_pipeline(ctx: RepoContext, http_client: httpx.AsyncClient) -> list[AnalyzerResult]:
    repo_task = asyncio.create_task(repo_structure.run(ctx))
    wf_task = asyncio.create_task(wf_analyzer.run(ctx))
    dep_task = asyncio.create_task(deps_analyzer.run(ctx, http_client))
    repo_res, wf_res, dep_res = await asyncio.gather(repo_task, wf_task, dep_task)
    return [repo_res, wf_res, dep_res]
