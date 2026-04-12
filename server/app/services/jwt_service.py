from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import JWTError, jwt

from app.config import Settings, get_settings


def create_access_token(
    subject: str,
    extra: Optional[dict[str, Any]] = None,
    settings: Optional[Settings] = None,
) -> str:
    s = settings or get_settings()
    now = datetime.now(timezone.utc)
    expire = now + timedelta(hours=s.jwt_expires_hours)
    payload: dict[str, Any] = {
        "sub": subject,
        "exp": expire,
        "iat": now,
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, s.jwt_secret, algorithm=s.jwt_algorithm)


def decode_token(token: str, settings: Optional[Settings] = None) -> dict[str, Any]:
    s = settings or get_settings()
    return jwt.decode(token, s.jwt_secret, algorithms=[s.jwt_algorithm])


def verify_token(token: str, settings: Optional[Settings] = None) -> Optional[str]:
    try:
        payload = decode_token(token, settings)
        sub = payload.get("sub")
        if isinstance(sub, str) and sub:
            return sub
    except JWTError:
        return None
    return None
