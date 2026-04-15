"""Build RepoContext from GitHub (tree + selected blobs)."""

from __future__ import annotations

import structlog

import httpx

from app.analyzers.types import RepoContext
from app.config import Settings, get_settings
from app.services.github_contents import (
    GitHubRepoError,
    get_blob_text,
    get_branch_tip_tree_sha,
    get_repo_meta,
    get_tree_recursive,
    index_git_tree,
    parse_github_repo_input,
)
logger = structlog.get_logger(__name__)

_MANIFEST_NAMES = frozenset(
    {
        "package.json",
        "package-lock.json",
        "npm-shrinkwrap.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        "requirements.txt",
        "requirements-dev.txt",
        "pyproject.toml",
        "poetry.lock",
        "pipfile",
        "pipfile.lock",
        "setup.py",
        "setup.cfg",
        "go.mod",
        "go.sum",
        "cargo.toml",
        "cargo.lock",
        "composer.json",
        "composer.lock",
        "gemfile",
        "gemfile.lock",
    }
)

_ROOT_HINTS = frozenset(
    {
        "readme.md",
        "readme.rst",
        "readme.txt",
        ".gitignore",
        "license",
        "license.md",
        "copying",
        "dockerfile",
        "docker-compose.yml",
        "docker-compose.yaml",
        "makefile",
        ".editorconfig",
        "contributing.md",
        "code_of_conduct.md",
        ".github/security.md",
        ".github/dependabot.yml",
        ".github/dependabot.yaml",
    }
)


def _pick_paths(
    all_paths: list[str],
    blob_shas: dict[str, str],
    settings: Settings,
) -> set[str]:
    want: set[str] = set()
    workflow_paths: list[str] = []

    for p in all_paths:
        pl = p.lower()
        base = pl.rsplit("/", 1)[-1]
        if base in _MANIFEST_NAMES or pl in _ROOT_HINTS:
            want.add(p)
        if pl == "readme.md" or base.startswith("readme."):
            want.add(p)
        if pl.endswith("/dockerfile") or base == "dockerfile":
            want.add(p)
        if pl.startswith(".github/workflows/") and (pl.endswith(".yml") or pl.endswith(".yaml")):
            workflow_paths.append(p)

    workflow_paths.sort()
    for wp in workflow_paths[: settings.analyze_max_workflow_files]:
        want.add(wp)

    # Cap total blob fetches
    max_blobs = 48
    if len(want) > max_blobs:
        trimmed = set(list(sorted(want))[:max_blobs])
        logger.warning("analysis_paths_trimmed", original=len(want), kept=len(trimmed))
        want = trimmed

    return {p for p in want if p in blob_shas}


async def build_repo_context(
    client: httpx.AsyncClient,
    repo_url: str | None,
    full_name: str | None,
    access_token: str | None,
    ref: str | None,
    settings: Settings | None = None,
) -> RepoContext:
    s = settings or get_settings()
    owner, repo = parse_github_repo_input(repo_url, full_name)
    full = f"{owner}/{repo}"

    async def meta_and_tree(token: str | None):
        meta = await get_repo_meta(client, owner, repo, token, s)
        branch = ref or meta.get("default_branch") or "main"
        commit_sha, tree_sha = await get_branch_tip_tree_sha(client, owner, repo, branch, token, s)
        tree_items, truncated = await get_tree_recursive(client, owner, repo, tree_sha, token, s)
        return meta, branch, commit_sha, tree_items, truncated

    effective_token: str | None = access_token
    if access_token:
        try:
            meta, branch, commit_sha, tree_items, truncated = await meta_and_tree(access_token)
        except GitHubRepoError as e:
            if e.status_code in (403, 404):
                logger.info("github_context_retry_public", err=e.code)
                effective_token = None
                meta, branch, commit_sha, tree_items, truncated = await meta_and_tree(None)
            else:
                raise
    else:
        meta, branch, commit_sha, tree_items, truncated = await meta_and_tree(None)

    all_paths, blob_shas = index_git_tree(tree_items)
    paths = _pick_paths(all_paths, blob_shas, s)
    files: dict[str, str] = {}
    for path in sorted(paths):
        sha = blob_shas.get(path)
        if not sha:
            continue
        try:
            files[path] = await get_blob_text(
                client, owner, repo, sha, effective_token, s.analyze_max_file_bytes, s
            )
        except GitHubRepoError as e:
            logger.warning("blob_fetch_skip", path=path, err=str(e))

    return RepoContext(
        owner=owner,
        repo=repo,
        full_name=full,
        default_branch=meta.get("default_branch") or "",
        resolved_branch=branch,
        commit_sha=commit_sha,
        tree_paths=all_paths,
        tree_truncated=truncated,
        files=files,
        meta=meta,
    )
