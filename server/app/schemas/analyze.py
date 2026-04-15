from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


class AnalyzeRequest(BaseModel):
    repo_url: str | None = Field(default=None, max_length=2048)
    full_name: str | None = Field(default=None, max_length=2048)
    ref: str | None = Field(default=None, max_length=256)
    ci_logs: str | None = Field(default=None, max_length=200_000)

    @model_validator(mode="after")
    def require_identifier(self):
        if not (self.repo_url and self.repo_url.strip()) and not (self.full_name and self.full_name.strip()):
            raise ValueError("Provide repo_url or full_name")
        return self


class FindingOut(BaseModel):
    id: str
    category: str
    severity: str
    title: str
    detail: str
    path: str | None = None
    evidence: dict[str, Any] = Field(default_factory=dict)


class AnalyzerOut(BaseModel):
    analyzer: str
    findings: list[FindingOut]
    data: dict[str, Any] = Field(default_factory=dict)


class InsightOut(BaseModel):
    title: str
    explanation: str
    category: str


class FixOut(BaseModel):
    problem: str
    impact: str
    exact_fix: str
    priority: int
    reasoning: str


class SetupOut(BaseModel):
    title: str
    command: str | None = None
    notes: str | None = None


class LogExplanationOut(BaseModel):
    root_cause: str
    explanation: str
    fix: str
    confidence: float


class AnalyzeResponse(BaseModel):
    repository: str
    default_branch: str
    resolved_branch: str
    commit_sha: str
    health_score: int = Field(ge=0, le=100)
    risk_level: Literal["LOW", "MEDIUM", "HIGH"]
    analyzers: list[AnalyzerOut]
    insights: list[InsightOut]
    fix_suggestions: list[FixOut]
    setup_guide: list[SetupOut]
    log_explanation: LogExplanationOut | None = None
