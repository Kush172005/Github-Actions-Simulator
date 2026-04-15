"""Deterministic health score and risk from analyzer findings."""

from __future__ import annotations

from typing import Literal

from app.analyzers.types import AnalyzerResult, Severity

RiskLevel = Literal["LOW", "MEDIUM", "HIGH"]

_WEIGHTS: dict[Severity, int] = {
    Severity.CRITICAL: 25,
    Severity.HIGH: 12,
    Severity.MEDIUM: 6,
    Severity.LOW: 2,
    Severity.INFO: 1,
}


def compute_score_and_risk(results: list[AnalyzerResult]) -> tuple[int, RiskLevel]:
    penalty = 0
    critical = 0
    high = 0
    for res in results:
        for f in res.findings:
            penalty += _WEIGHTS.get(f.severity, 2)
            if f.severity == Severity.CRITICAL:
                critical += 1
            elif f.severity == Severity.HIGH:
                high += 1

    score = max(0, min(100, 100 - penalty))

    if critical > 0 or score < 40 or high >= 4:
        risk: RiskLevel = "HIGH"
    elif score < 70 or high >= 1:
        risk = "MEDIUM"
    else:
        risk = "LOW"
    return score, risk
