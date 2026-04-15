"""Shared Async HTTP client bound to app lifespan."""

import httpx

from app.config import get_settings


def create_http_client() -> httpx.AsyncClient:
    s = get_settings()
    return httpx.AsyncClient(
        timeout=httpx.Timeout(s.github_analyze_timeout_s),
        follow_redirects=True,
        limits=httpx.Limits(max_connections=50, max_keepalive_connections=20),
    )
