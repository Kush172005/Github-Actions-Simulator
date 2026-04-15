"""GitHub REST helpers for repository analysis (tree + blob fetch)."""

from __future__ import annotations

import base64
import re
from typing import Any
from urllib.parse import unquote, urlparse

import httpx
import structlog

from app.config import Settings, get_settings
from app.services.github_oauth import _GH_HEADERS_BASE

logger = structlog.get_logger(__name__)

_GH_HOSTS = frozenset(
    {"github.com", "www.github.com", "api.github.com"}
)


class GitHubRepoError(Exception):
    """Stable error for API mapping."""

    def __init__(self, code: str, message: str, status_code: int | None = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def _headers(access_token: str | None) -> dict[str, str]:
    h = dict(_GH_HEADERS_BASE)
    if access_token and access_token.strip():
        h["Authorization"] = f"Bearer {access_token.strip()}"
    return h


def parse_github_repo_input(
    repo_url: str | None,
    full_name: str | None,
) -> tuple[str, str]:
    """Return (owner, repo) from URL or owner/repo string."""
    raw = (full_name or "").strip() if full_name else ""
    if repo_url and repo_url.strip():
        raw = repo_url.strip()
    if not raw:
        raise GitHubRepoError("invalid_input", "Provide repo_url or full_name", 400)

    raw = raw.removeprefix("git@github.com:").removeprefix("ssh://git@github.com/")
    if "github.com" in raw or raw.startswith("http"):
        parsed = urlparse(raw if "://" in raw else f"https://{raw}")
        host = (parsed.hostname or "").lower()
        if host not in _GH_HOSTS and not host.endswith(".github.com"):
            raise GitHubRepoError("invalid_host", "Only github.com repositories are supported", 400)
        path = unquote((parsed.path or "").strip("/"))
        parts = [p for p in path.split("/") if p and p not in ("blob", "tree", "pull", "issues")]
        # Strip /blob/branch/... segments
        cleaned: list[str] = []
        skip_next = False
        for i, p in enumerate(parts):
            if p in ("blob", "tree") and i + 2 < len(parts):
                skip_next = True
                continue
            if skip_next:
                skip_next = False
                continue
            cleaned.append(p)
        if len(cleaned) >= 2:
            owner, repo = cleaned[0], cleaned[1]
            repo = repo.removesuffix(".git")
            return owner, repo
        raise GitHubRepoError("invalid_path", "Could not parse owner/repo from URL", 400)

    if "/" not in raw:
        raise GitHubRepoError("invalid_full_name", "Expected owner/repo", 400)
    owner, repo = raw.split("/", 1)
    owner, repo = owner.strip(), repo.strip().removesuffix(".git")
    if not owner or not repo or not re.match(r"^[a-zA-Z0-9_.-]+$", owner) or not re.match(
        r"^[a-zA-Z0-9_.-]+$", repo
    ):
        raise GitHubRepoError("invalid_full_name", "Invalid owner or repository name", 400)
    return owner, repo


def _map_httpx_error(e: httpx.HTTPStatusError) -> GitHubRepoError:
    status = e.response.status_code
    if status == 404:
        return GitHubRepoError("not_found", "Repository not found or not accessible", 404)
    if status in (401, 403):
        return GitHubRepoError(
            "forbidden",
            "Private repository or insufficient GitHub permissions — connect GitHub or check access",
            403,
        )
    if status == 429:
        return GitHubRepoError("rate_limited", "GitHub API rate limit exceeded", 429)
    return GitHubRepoError("github_error", f"GitHub API error ({status})", 502)


async def get_repo_meta(
    client: httpx.AsyncClient,
    owner: str,
    repo: str,
    access_token: str | None,
    settings: Settings | None = None,
) -> dict[str, Any]:
    s = settings or get_settings()
    url = f"https://api.github.com/repos/{owner}/{repo}"
    try:
        r = await client.get(url, headers=_headers(access_token), timeout=s.github_analyze_timeout_s)
        r.raise_for_status()
        return r.json()
    except httpx.HTTPStatusError as e:
        raise _map_httpx_error(e) from e


def _tree_sha_from_branch_payload(data: dict[str, Any]) -> tuple[str, str]:
    """Parse GET /repos/{o}/{r}/branches/{branch} JSON → (commit_sha, tree_sha)."""
    commit = data.get("commit") or {}
    commit_sha = (commit.get("sha") or "").strip()
    inner = commit.get("commit")
    tree_sha = ""
    if isinstance(inner, dict):
        tree = inner.get("tree")
        if isinstance(tree, dict):
            tree_sha = (tree.get("sha") or "").strip()
    if not tree_sha:
        tree = commit.get("tree")
        if isinstance(tree, dict):
            tree_sha = (tree.get("sha") or "").strip()
    return commit_sha, tree_sha


async def _fetch_tree_sha_via_git_commit(
    client: httpx.AsyncClient,
    owner: str,
    repo: str,
    commit_sha: str,
    access_token: str | None,
    settings: Settings,
) -> str:
    url = f"https://api.github.com/repos/{owner}/{repo}/git/commits/{commit_sha}"
    r = await client.get(url, headers=_headers(access_token), timeout=settings.github_analyze_timeout_s)
    r.raise_for_status()
    payload = r.json()
    tree = payload.get("tree")
    if isinstance(tree, dict):
        return (tree.get("sha") or "").strip()
    return ""


async def get_branch_tip_tree_sha(
    client: httpx.AsyncClient,
    owner: str,
    repo: str,
    branch: str,
    access_token: str | None,
    settings: Settings | None = None,
) -> tuple[str, str]:
    """Return (commit_sha, tree_sha) for branch tip."""
    s = settings or get_settings()
    url = f"https://api.github.com/repos/{owner}/{repo}/branches/{branch}"
    try:
        r = await client.get(url, headers=_headers(access_token), timeout=s.github_analyze_timeout_s)
        r.raise_for_status()
        data = r.json()
        commit_sha, tree_sha = _tree_sha_from_branch_payload(data)
        if commit_sha and not tree_sha:
            try:
                tree_sha = await _fetch_tree_sha_via_git_commit(
                    client, owner, repo, commit_sha, access_token, s
                )
            except httpx.HTTPStatusError as e:
                raise _map_httpx_error(e) from e
        if not commit_sha or not tree_sha:
            raise GitHubRepoError("github_error", "Unexpected branch response from GitHub", 502)
        return commit_sha, tree_sha
    except httpx.HTTPStatusError as e:
        raise _map_httpx_error(e) from e


async def get_tree_recursive(
    client: httpx.AsyncClient,
    owner: str,
    repo: str,
    tree_sha: str,
    access_token: str | None,
    settings: Settings | None = None,
) -> tuple[list[dict[str, Any]], bool]:
    s = settings or get_settings()
    url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{tree_sha}"
    try:
        r = await client.get(
            url,
            params={"recursive": "1"},
            headers=_headers(access_token),
            timeout=s.github_analyze_timeout_s,
        )
        r.raise_for_status()
        data = r.json()
        items = data.get("tree") or []
        truncated = bool(data.get("truncated"))
        return items, truncated
    except httpx.HTTPStatusError as e:
        raise _map_httpx_error(e) from e


async def get_blob_text(
    client: httpx.AsyncClient,
    owner: str,
    repo: str,
    blob_sha: str,
    access_token: str | None,
    max_bytes: int,
    settings: Settings | None = None,
) -> str:
    s = settings or get_settings()
    url = f"https://api.github.com/repos/{owner}/{repo}/git/blobs/{blob_sha}"
    try:
        r = await client.get(url, headers=_headers(access_token), timeout=s.github_analyze_timeout_s)
        r.raise_for_status()
        data = r.json()
        if data.get("encoding") == "base64" and data.get("content"):
            raw = base64.b64decode(data["content"])
            if len(raw) > max_bytes:
                raise GitHubRepoError("file_too_large", "File exceeds analysis size limit", 400)
            return raw.decode("utf-8", errors="replace")
        return ""
    except httpx.HTTPStatusError as e:
        raise _map_httpx_error(e) from e


def index_git_tree(tree_items: list[dict[str, Any]]) -> tuple[list[str], dict[str, str]]:
    """Return all paths and mapping path -> blob sha for files."""
    all_paths: list[str] = []
    blob_shas: dict[str, str] = {}
    for item in tree_items:
        path = item.get("path")
        if not path:
            continue
        all_paths.append(path)
        if item.get("type") == "blob" and item.get("sha"):
            blob_shas[path] = item["sha"]
    return all_paths, blob_shas
