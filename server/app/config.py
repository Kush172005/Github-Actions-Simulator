from functools import lru_cache
from typing import List

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    mongodb_uri: str = "mongodb://localhost:27017"
    database_name: str = "shipstack"

    jwt_secret: str = "change-me-in-production-use-openssl-rand-hex-32"
    jwt_algorithm: str = "HS256"
    jwt_expires_hours: int = 168  # 7 days

    google_client_id: str = ""

    github_client_id: str = ""
    github_client_secret: str = ""
    # Default matches production SPA; override with GITHUB_OAUTH_REDIRECT_URI (e.g. localhost for local API).
    github_oauth_redirect_uri: str = "https://chah-shipstack.vercel.app/auth/callback/github"

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    huggingface_api_key: str = Field(
        default="",
        validation_alias="HUGGINGFACE_API_KEY",
        description="Hugging Face API token for Inference API (preferred env name).",
    )
    huggingface_api_token: str = Field(
        default="",
        validation_alias="HUGGINGFACE_API_TOKEN",
        description="Alternate env name; merged into huggingface_api_key if key is empty.",
    )

    @field_validator("huggingface_api_key", "huggingface_api_token", mode="before")
    @classmethod
    def _strip_hf_fields(cls, v):
        if v is None:
            return ""
        return str(v).strip().strip('"').strip("'")

    @model_validator(mode="after")
    def _merge_huggingface_credentials(self):
        key = (self.huggingface_api_key or "").strip()
        tok = (self.huggingface_api_token or "").strip()
        merged = key or tok
        object.__setattr__(self, "huggingface_api_key", merged)
        return self

    ai_request_timeout_s: float = 90.0
    ai_max_retries: int = 3
    ai_max_output_tokens: int = 4096
    github_analyze_timeout_s: float = 60.0
    analyze_max_ci_log_chars: int = 120_000
    analyze_max_file_bytes: int = 512_000
    analyze_max_workflow_files: int = 32
    analyze_max_workflow_bytes: int = 256_000

    @property
    def cors_origin_list(self) -> List[str]:
        # Origin header never includes a trailing slash; strip so env typos still match.
        return [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
