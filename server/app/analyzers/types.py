from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


@dataclass
class Finding:
    id: str
    category: str
    severity: Severity
    title: str
    detail: str
    path: str | None = None
    evidence: dict[str, Any] = field(default_factory=dict)


@dataclass
class AnalyzerResult:
    analyzer: str
    findings: list[Finding]
    data: dict[str, Any] = field(default_factory=dict)


@dataclass
class RepoContext:
    owner: str
    repo: str
    full_name: str
    default_branch: str
    resolved_branch: str
    commit_sha: str
    tree_paths: list[str]
    tree_truncated: bool
    files: dict[str, str]
    meta: dict[str, Any]
