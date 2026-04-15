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
