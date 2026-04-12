from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_user_doc
from app.services import github_oauth

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
