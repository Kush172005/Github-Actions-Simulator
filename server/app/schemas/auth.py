from pydantic import BaseModel, Field


class GoogleAuthRequest(BaseModel):
    credential: str = Field(..., min_length=10, description="Google ID token (JWT)")


class GitHubAuthRequest(BaseModel):
    code: str = Field(..., min_length=1)
    redirect_uri: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
