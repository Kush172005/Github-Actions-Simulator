from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.db import get_database
from app.schemas.auth import GitHubAuthRequest, GoogleAuthRequest, TokenResponse
from app.services import github_oauth
from app.services.google_verify import verify_google_id_token
from app.services.jwt_service import create_access_token, verify_token

router = APIRouter(prefix="/auth", tags=["auth"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


@router.post("/google", response_model=TokenResponse)
async def auth_google(body: GoogleAuthRequest) -> TokenResponse:
    try:
        claims = verify_google_id_token(body.credential)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    sub = claims.get("sub")
    email = (claims.get("email") or "").strip().lower()
    if not sub or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google token missing email or subject",
        )

    name = claims.get("name") or email.split("@")[0]
    avatar = claims.get("picture") or ""

    db = get_database()
    existing = await db.users.find_one(
        {"$or": [{"google_sub": sub}, {"email": email}]}
    )

    if existing:
        await db.users.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "name": name,
                    "avatar": avatar,
                    "google_sub": sub,
                    "updated_at": _now(),
                }
            },
        )
        uid = str(existing["_id"])
    else:
        doc = {
            "email": email,
            "name": name,
            "avatar": avatar,
            "provider": "google",
            "google_sub": sub,
            "github_id": None,
            "github_login": None,
            "github_access_token": None,
            "created_at": _now(),
            "updated_at": _now(),
        }
        try:
            result = await db.users.insert_one(doc)
            uid = str(result.inserted_id)
        except DuplicateKeyError as e:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Account exists with different provider",
            ) from e

    token = create_access_token(uid, {"email": email})
    return TokenResponse(access_token=token)


@router.post("/github", response_model=TokenResponse)
async def auth_github(
    body: GitHubAuthRequest,
    authorization: str | None = Header(None, alias="Authorization"),
) -> TokenResponse:
    """
    Exchange OAuth code for GitHub access token.
    If Authorization Bearer is present, link GitHub to that user.
    Otherwise create/find user by GitHub identity.
    """
    from app.config import get_settings

    s = get_settings()
    got = github_oauth.normalize_oauth_redirect_uri(body.redirect_uri)
    want = github_oauth.normalize_oauth_redirect_uri(s.github_oauth_redirect_uri)
    if got != want:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "redirect_uri does not match API GITHUB_OAUTH_REDIRECT_URI. "
                f"Client sent {body.redirect_uri!r}; server expects {s.github_oauth_redirect_uri!r}. "
                "Set GITHUB_OAUTH_REDIRECT_URI on Render to your Vercel callback, e.g. "
                "https://chah-shipstack.vercel.app/auth/callback/github"
            ),
        )

    try:
        access_token = await github_oauth.exchange_code_for_token(
            body.code, body.redirect_uri
        )
        gh_user = await github_oauth.fetch_github_user(access_token)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"GitHub request failed: {e!s}",
        ) from e

    gh_id = gh_user.get("id")
    login = gh_user.get("login") or ""
    email = (gh_user.get("email") or "").strip().lower()
    if not email:
        try:
            email = await github_oauth.fetch_github_primary_email(access_token)
        except Exception:
            email = None
    if not email:
        email = f"{login}@users.noreply.github.com" if login else f"id{gh_id}@users.noreply.github.com"

    name = gh_user.get("name") or login or email.split("@")[0]
    avatar = gh_user.get("avatar_url") or ""

    db = get_database()
    link_user_id: str | None = None
    if authorization and authorization.lower().startswith("bearer "):
        raw = authorization.split(" ", 1)[1].strip()
        link_user_id = verify_token(raw)
        if link_user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session token",
            )

    if link_user_id:
        try:
            oid = ObjectId(link_user_id)
        except Exception:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        target = await db.users.find_one({"_id": oid})
        if not target:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        await db.users.update_one(
            {"_id": oid},
            {
                "$set": {
                    "github_id": gh_id,
                    "github_login": login,
                    "github_access_token": access_token,
                    "provider": "google_github"
                    if target.get("provider") == "google"
                    else "github",
                    "avatar": avatar or target.get("avatar", ""),
                    "name": name or target.get("name", ""),
                    "updated_at": _now(),
                }
            },
        )
        token = create_access_token(link_user_id, {"email": target.get("email", email)})
        return TokenResponse(access_token=token)

    existing = await db.users.find_one({"github_id": gh_id})
    if existing:
        await db.users.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "github_access_token": access_token,
                    "github_login": login,
                    "name": name,
                    "avatar": avatar or existing.get("avatar", ""),
                    "updated_at": _now(),
                }
            },
        )
        uid = str(existing["_id"])
    else:
        by_email = await db.users.find_one({"email": email})
        if by_email:
            await db.users.update_one(
                {"_id": by_email["_id"]},
                {
                    "$set": {
                        "github_id": gh_id,
                        "github_login": login,
                        "github_access_token": access_token,
                        "provider": "google_github"
                        if by_email.get("provider") == "google"
                        else "github",
                        "avatar": avatar or by_email.get("avatar", ""),
                        "updated_at": _now(),
                    }
                },
            )
            uid = str(by_email["_id"])
        else:
            doc = {
                "email": email,
                "name": name,
                "avatar": avatar,
                "provider": "github",
                "github_id": gh_id,
                "github_login": login,
                "github_access_token": access_token,
                "google_sub": None,
                "created_at": _now(),
                "updated_at": _now(),
            }
            try:
                result = await db.users.insert_one(doc)
                uid = str(result.inserted_id)
            except DuplicateKeyError as e:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Could not create user",
                ) from e

    token = create_access_token(uid, {"email": email})
    return TokenResponse(access_token=token)
