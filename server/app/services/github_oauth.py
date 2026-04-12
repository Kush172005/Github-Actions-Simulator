import httpx

from app.config import Settings, get_settings

# GitHub REST API rejects requests without a identifying User-Agent (see GitHub API docs).
_GH_HEADERS_BASE = {
    "User-Agent": "ShipStack/1.0 (OAuth; +https://github.com/)",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}


async def exchange_code_for_token(
    code: str,
    redirect_uri: str,
    settings: Settings | None = None,
) -> str:
    s = settings or get_settings()
    if not s.github_client_id or not s.github_client_secret:
        raise ValueError("GitHub OAuth is not configured")
    async with httpx.AsyncClient() as client:
        r = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={
                "Accept": "application/json",
                "User-Agent": _GH_HEADERS_BASE["User-Agent"],
            },
            data={
                "client_id": s.github_client_id,
                "client_secret": s.github_client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
            },
            timeout=30.0,
        )
        r.raise_for_status()
        data = r.json()
        if "error" in data:
            raise ValueError(data.get("error_description") or data["error"])
        token = data.get("access_token")
        if not token:
            raise ValueError("No access_token in GitHub response")
        return token


async def fetch_github_user(access_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token.strip()}",
                **_GH_HEADERS_BASE,
            },
            timeout=30.0,
        )
        r.raise_for_status()
        return r.json()


async def fetch_github_primary_email(access_token: str) -> str | None:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://api.github.com/user/emails",
            headers={
                "Authorization": f"Bearer {access_token.strip()}",
                **_GH_HEADERS_BASE,
            },
            timeout=30.0,
        )
        r.raise_for_status()
        emails = r.json()
        for row in emails:
            if row.get("primary") and row.get("email"):
                return row["email"]
        for row in emails:
            if row.get("verified") and row.get("email"):
                return row["email"]
        return emails[0]["email"] if emails else None


async def fetch_user_repositories(access_token: str, per_page: int = 100) -> list[dict]:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://api.github.com/user/repos",
            params={
                "per_page": per_page,
                "sort": "updated",
                "affiliation": "owner,collaborator,organization_member",
            },
            headers={
                "Authorization": f"Bearer {access_token.strip()}",
                **_GH_HEADERS_BASE,
            },
            timeout=45.0,
        )
        r.raise_for_status()
        return r.json()
