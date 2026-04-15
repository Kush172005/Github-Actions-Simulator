"""Clamp and clean model outputs before returning to clients."""

from __future__ import annotations

import re

from app.ai.schemas import InsightBundle, LogExplanation


_CTRL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def _clean_str(s: str, max_len: int) -> str:
    t = _CTRL.sub(" ", s or "").strip()
    if len(t) > max_len:
        t = t[: max_len - 1] + "…"
    t = re.sub(r"(?i)javascript:", "", t)
    return t


def sanitize_insight_bundle(bundle: InsightBundle) -> InsightBundle:
    insights = []
    for it in bundle.insights[:24]:
        insights.append(
            type(it)(
                title=_clean_str(it.title, 200),
                explanation=_clean_str(it.explanation, 4000),
                category=_clean_str(it.category, 64) or "general",
            )
        )
    fixes = []
    for fx in bundle.fix_suggestions[:30]:
        fixes.append(
            type(fx)(
                problem=_clean_str(fx.problem, 500),
                impact=_clean_str(fx.impact, 1500),
                exact_fix=_clean_str(fx.exact_fix, 4000),
                priority=max(1, min(100, int(fx.priority))),
                reasoning=_clean_str(fx.reasoning, 2000),
            )
        )
    steps = []
    for st in bundle.setup_guide[:20]:
        steps.append(
            type(st)(
                title=_clean_str(st.title, 200),
                command=_clean_str(st.command, 2000) if st.command else None,
                notes=_clean_str(st.notes, 2000) if st.notes else None,
            )
        )
    return InsightBundle(insights=insights, fix_suggestions=fixes, setup_guide=steps)


def sanitize_log_explanation(obj: LogExplanation) -> LogExplanation:
    return LogExplanation(
        root_cause=_clean_str(obj.root_cause, 2000),
        explanation=_clean_str(obj.explanation, 4000),
        fix=_clean_str(obj.fix, 4000),
        confidence=max(0.0, min(1.0, float(obj.confidence))),
    )


def strip_ansi(logs: str, max_chars: int) -> str:
    raw = logs or ""
    raw = re.sub(r"\x1b\[[0-?]*[ -/]*[@-~]", "", raw)
    if len(raw) > max_chars:
        head = max_chars // 2
        tail = max_chars - head
        raw = raw[:head] + "\n…[truncated]…\n" + raw[-tail:]
    return raw
