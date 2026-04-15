"""CI log explanation via LLM."""

from __future__ import annotations

from app.ai.client import AIClient
from app.ai.sanitize import strip_ansi
from app.ai.schemas import LogExplanation
from app.config import get_settings


async def explain_logs(repo_full_name: str, raw_logs: str, client: AIClient) -> LogExplanation:
    s = get_settings()
    cleaned = strip_ansi(raw_logs, s.analyze_max_ci_log_chars)
    return await client.explain_logs(repo_full_name, cleaned)
