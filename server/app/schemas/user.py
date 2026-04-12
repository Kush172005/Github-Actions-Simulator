from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class UserPublic(BaseModel):
    id: str
    email: str
    name: str
    avatar: str = ""
    provider: str
    github_connected: bool = False
    created_at: Optional[datetime] = None


class UserDocument(BaseModel):
    email: str
    name: str
    avatar: str = ""
    provider: Literal["google", "github", "google_github"] = "google"
    google_sub: Optional[str] = None
    github_id: Optional[int] = None
    github_login: Optional[str] = None
    github_access_token: Optional[str] = None
    created_at: datetime
