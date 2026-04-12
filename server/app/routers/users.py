from typing import Annotated

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user_doc
from app.schemas.user import UserPublic

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/me", response_model=UserPublic)
async def read_me(user: Annotated[dict, Depends(get_current_user_doc)]) -> UserPublic:
    return UserPublic(
        id=str(user["_id"]),
        email=user.get("email", ""),
        name=user.get("name", ""),
        avatar=user.get("avatar") or "",
        provider=user.get("provider", "google"),
        github_connected=bool(user.get("github_access_token")),
        created_at=user.get("created_at"),
    )
