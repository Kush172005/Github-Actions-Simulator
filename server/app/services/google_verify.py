from google.auth.exceptions import GoogleAuthError
from google.auth.transport import requests
from google.oauth2 import id_token

from app.config import Settings, get_settings


def verify_google_id_token(raw_token: str, settings: Settings | None = None) -> dict:
    """
    Verify Google ID token and return claims (email, name, picture, sub).
    """
    s = settings or get_settings()
    if not s.google_client_id:
        raise ValueError("GOOGLE_CLIENT_ID is not configured")
    request = requests.Request()
    try:
        claims = id_token.verify_oauth2_token(
            raw_token, request, audience=s.google_client_id
        )
    except GoogleAuthError as e:
        raise ValueError(f"Invalid Google token: {e}") from e
    return claims
