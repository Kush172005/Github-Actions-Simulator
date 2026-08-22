"""Pydantic models for validated LLM JSON outputs."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class InsightItem(BaseModel):
    title: str = Field(..., max_length=200)
    explanation: str = Field(..., max_length=4000)
    category: str = Field(default="general", max_length=64)


class FixSuggestion(BaseModel):
    problem: str = Field(..., max_length=500)
    impact: str = Field(..., max_length=1500)
    exact_fix: str = Field(..., max_length=4000)
    priority: int = Field(default=50, ge=1, le=100)
    reasoning: str = Field(..., max_length=2000)

    @field_validator("priority", mode="before")
    @classmethod
    def _priority(cls, v):
        try:
            x = int(v)
        except (TypeError, ValueError):
            return 50
        return max(1, min(100, x))


class SetupStep(BaseModel):
    title: str = Field(..., max_length=200)
    command: str | None = Field(default=None, max_length=2000)
    notes: str | None = Field(default=None, max_length=2000)


class InsightBundle(BaseModel):
    insights: list[InsightItem] = Field(default_factory=list, max_length=24)
    fix_suggestions: list[FixSuggestion] = Field(default_factory=list, max_length=30)
    setup_guide: list[SetupStep] = Field(default_factory=list, max_length=20)


class LogExplanation(BaseModel):
    root_cause: str = Field(..., max_length=2000)
    explanation: str = Field(..., max_length=4000)
    fix: str = Field(..., max_length=4000)
    confidence: float = Field(ge=0.0, le=1.0)

    @field_validator("confidence")
    @classmethod
    def round_conf(cls, v: float) -> float:
        return round(float(v), 3)


class RiskLevelStr(BaseModel):
    """Used only for typing elsewhere; risk comes from scoring engine."""

    level: Literal["LOW", "MEDIUM", "HIGH"] = "LOW"


class CorrelationItem(BaseModel):
    title: str = Field(..., max_length=300)
    detail: str = Field(..., max_length=2000)
    evidence: dict = Field(default_factory=dict)


class RunDiagnosis(BaseModel):
    """Validated LLM output for a completed GitHub Actions run analysis."""

    root_cause: str = Field(..., max_length=2000)
    explanation: str = Field(..., max_length=5000)
    fix: str = Field(..., max_length=5000)
    confidence: float = Field(ge=0.0, le=1.0)
    affected_job: str | None = Field(default=None, max_length=500)
    affected_step: str | None = Field(default=None, max_length=500)
    what_worked: list[str] = Field(default_factory=list, max_length=30)
    warnings: list[str] = Field(default_factory=list, max_length=20)
    correlations: list[CorrelationItem] = Field(default_factory=list, max_length=10)

    @field_validator("confidence")
    @classmethod
    def round_conf(cls, v: float) -> float:
        return round(float(v), 3)

    @field_validator("what_worked", "warnings", mode="before")
    @classmethod
    def ensure_str_list(cls, v: object) -> list[str]:
        if not isinstance(v, list):
            return []
        return [str(item) for item in v if item]

    @field_validator("correlations", mode="before")
    @classmethod
    def coerce_correlations(cls, v: object) -> list:
        if not isinstance(v, list):
            return []
        result = []
        for item in v:
            if isinstance(item, dict):
                result.append(item)
            elif hasattr(item, "title") and hasattr(item, "detail"):
                # Already a CorrelationItem or compatible object
                result.append({
                    "title": item.title,
                    "detail": item.detail,
                    "evidence": getattr(item, "evidence", {}),
                })
        return result
