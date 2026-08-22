from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.dependencies import get_current_user_doc
from app.services import github_oauth
from app.services.github_actions import (
    WorkflowRunSlim,
    list_workflow_runs,
)
from app.services.github_contents import GitHubRepoError

router = APIRouter(prefix="/github", tags=["github"])


def _serialize_repo(raw: dict[str, Any]) -> dict[str, Any]:
    lang = raw.get("language")
    return {
        "id": raw.get("id"),
        "name": raw.get("name"),
        "full_name": raw.get("full_name"),
        "description": raw.get("description"),
        "private": raw.get("private"),
        "html_url": raw.get("html_url"),
        "language": lang,
        "stargazers_count": raw.get("stargazers_count") or 0,
        "forks_count": raw.get("forks_count") or 0,
        "updated_at": raw.get("updated_at"),
        "pushed_at": raw.get("pushed_at"),
        "default_branch": raw.get("default_branch"),
    }


@router.get("/repos")
async def list_repositories(
    user: Annotated[dict, Depends(get_current_user_doc)],
) -> list[dict[str, Any]]:
    token = user.get("github_access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Connect GitHub to list repositories",
        )
    try:
        repos = await github_oauth.fetch_user_repositories(token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"GitHub API error: {e!s}",
        ) from e

    return [_serialize_repo(r) for r in repos]


def _serialize_run(run: WorkflowRunSlim) -> dict[str, Any]:
    return {
        "id": run.id,
        "name": run.name,
        "head_branch": run.head_branch,
        "head_sha": run.head_sha,
        "event": run.event,
        "status": run.status,
        "conclusion": run.conclusion,
        "html_url": run.html_url,
        "created_at": run.created_at,
        "updated_at": run.updated_at,
        "run_number": run.run_number,
        "run_attempt": run.run_attempt,
        "workflow_path": run.path,
        "duration_seconds": run.duration_seconds,
    }


@router.get("/repos/{owner}/{repo}/actions/runs")
async def list_actions_runs(
    owner: str,
    repo: str,
    request: Request,
    user: Annotated[dict, Depends(get_current_user_doc)],
    page: int = Query(default=1, ge=1, le=100),
) -> dict[str, Any]:
    """List a page of GitHub Actions workflow runs for a repository."""
    if (
        not owner
        or not repo
        or owner in ("undefined", "null")
        or repo in ("undefined", "null")
        or "/" in owner
        or "/" in repo
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid owner or repository name",
        )
    token = user.get("github_access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Connect GitHub to view Actions runs",
        )
    client = getattr(request.app.state, "http_client", None)
    if client is None:
        raise HTTPException(status_code=500, detail="HTTP client not initialized")
    try:
        runs, total_count, per_page = await list_workflow_runs(
            client, owner, repo, token, page=page
        )
    except GitHubRepoError as e:
        raise HTTPException(status_code=e.status_code or 400, detail=e.message) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"GitHub Actions API error: {e!s}",
        ) from e

    loaded_through = (page - 1) * per_page + len(runs)
    has_more = loaded_through < total_count and len(runs) >= per_page

    return {
        "runs": [_serialize_run(r) for r in runs],
        "page": page,
        "per_page": per_page,
        "total_count": total_count,
        "has_more": has_more,
    }
