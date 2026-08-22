"""Request/response schemas for GitHub Actions run analysis."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, model_validator


class RunAnalyzeRequest(BaseModel):
    repo_url: str | None = Field(default=None, max_length=2048)
    full_name: str | None = Field(default=None, max_length=2048)
    run_id: int

    @model_validator(mode="after")
    def require_identifier(self):
        if not (self.repo_url and self.repo_url.strip()) and not (
            self.full_name and self.full_name.strip()
        ):
            raise ValueError("Provide repo_url or full_name")
        return self


class StepOut(BaseModel):
    name: str
    number: int
    status: str
    conclusion: str | None = None


class JobOut(BaseModel):
    id: int
    name: str
    status: str
    conclusion: str | None = None
    started_at: str | None = None
    completed_at: str | None = None
    duration_seconds: int | None = None
    steps: list[StepOut] = Field(default_factory=list)


class RunOut(BaseModel):
    id: int
    name: str
    head_branch: str
    head_sha: str
    event: str
    status: str
    conclusion: str | None = None
    html_url: str
    created_at: str
    updated_at: str
    run_number: int
    workflow_path: str
    duration_seconds: int | None = None


class CorrelationOut(BaseModel):
    title: str
    detail: str
    evidence: dict[str, Any] = Field(default_factory=dict)


class DiagnosisOut(BaseModel):
    root_cause: str
    explanation: str
    fix: str
    confidence: float
    affected_job: str | None = None
    affected_step: str | None = None


class RunAnalyzeResponse(BaseModel):
    repository: str
    run_id: int
    run: RunOut
    jobs: list[JobOut]
    diagnosis: DiagnosisOut | None = None
    what_worked: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    correlations: list[CorrelationOut] = Field(default_factory=list)
    logs_available: bool = True
    ai_warning: str | None = None
