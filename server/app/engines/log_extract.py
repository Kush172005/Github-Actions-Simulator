"""Deterministic log signal extraction — targeted context before AI analysis.

Strategy: rather than sending full job logs to the LLM, we extract:
  - A small head block (first N lines for env/setup context)
  - Error windows: lines matching known failure patterns plus surrounding context
  - A tail block (last N lines — usually where the final error/exit code appears)

This keeps the AI payload within budget and focuses attention on signal, not noise.
"""

from __future__ import annotations

import re

_ERROR_RE = re.compile(
    r"(##\[error\]"
    r"|##\[group\]Post job cleanup"  # marks end of useful content
    r"|Error:|ERROR:"
    r"|error TS\d+"
    r"|FAILED|FAILURE|BUILD FAILED"
    r"|Tests? failed|test suite failed"
    r"|fatal:|Fatal:|FATAL:"
    r"|exit code [1-9]\d*"
    r"|Process exited with code [1-9]"
    r"|npm ERR!|yarn error"
    r"|pip.*[Ee]rror"
    r"|command not found"
    r"|No such file or directory"
    r"|Permission denied"
    r"|Cannot find module"
    r"|Could not resolve"
    r"|Unable to load"
    r"|ModuleNotFoundError"
    r"|ImportError|SyntaxError|TypeError|ReferenceError|AssertionError"
    r"|ENOENT|EACCES|EADDRINUSE"
    r"|\bfailed to\b)",
    re.IGNORECASE,
)

_WARN_RE = re.compile(
    r"(##\[warning\]|warning:|WARN:|deprecated|security advisory)",
    re.IGNORECASE,
)

_HEAD_LINES = 60    # First N lines for env/setup context
_TAIL_LINES = 100   # Last N lines — typically has final error/exit
_CTX_BEFORE = 3     # Lines before each error line
_CTX_AFTER = 6      # Lines after each error line
_MAX_WINDOWS = 10   # Max distinct error windows


def extract_log_signals(raw: str, max_chars: int) -> str:
    """Return a compact, error-focused extract of a raw job log.

    If the log is short enough, it is returned as-is (within max_chars).
    Otherwise the head+error-windows+tail strategy is applied.
    """
    if not raw:
        return ""

    lines = raw.splitlines()
    total = len(lines)

    # Short log: return verbatim (capped)
    if total <= _HEAD_LINES + _TAIL_LINES:
        return raw[:max_chars]

    # --- Head block ---
    head = lines[:_HEAD_LINES]

    # --- Error windows ---
    windows: list[tuple[int, int]] = []
    for i, line in enumerate(lines):
        if not _ERROR_RE.search(line):
            continue
        lo = max(_HEAD_LINES, i - _CTX_BEFORE)
        hi = min(total - 1, i + _CTX_AFTER)
        if windows and lo <= windows[-1][1] + 2:
            windows[-1] = (windows[-1][0], hi)
        elif len(windows) < _MAX_WINDOWS:
            windows.append((lo, hi))

    # --- Tail block ---
    tail_start = max(total - _TAIL_LINES, _HEAD_LINES)
    tail = lines[tail_start:]

    # --- Assemble ---
    parts: list[str] = ["=== SETUP / HEAD ===", "\n".join(head)]

    seen: set[tuple[int, int]] = set()
    for lo, hi in windows:
        key = (lo, hi)
        if key in seen:
            continue
        seen.add(key)
        if hi < _HEAD_LINES or lo >= tail_start:
            continue  # already covered by head/tail
        parts.append(f"\n=== ERROR CONTEXT (lines {lo+1}–{hi+1}) ===")
        parts.append("\n".join(lines[lo : hi + 1]))

    parts.append("\n=== TAIL ===")
    parts.append("\n".join(tail))

    result = "\n".join(parts)
    if len(result) > max_chars:
        half = max_chars // 2
        result = result[:half] + "\n…[log truncated]…\n" + result[-half:]
    return result
