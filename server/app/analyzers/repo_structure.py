"""Repository structure and hygiene analyzer (no LLM)."""

from __future__ import annotations

from app.analyzers.types import AnalyzerResult, Finding, RepoContext, Severity


def _has_readme(paths: list[str]) -> bool:
    for p in paths:
        pl = p.lower()
        if pl == "readme.md" or pl == "readme.rst" or pl.startswith("docs/readme"):
            return True
        base = pl.rsplit("/", 1)[-1]
        if base.startswith("readme.") and pl.count("/") <= 1:
            return True
    return False


def _has_license(paths: list[str]) -> bool:
    for p in paths:
        pl = p.lower().replace("\\", "/")
        base = pl.rsplit("/", 1)[-1]
        if base in ("license", "license.md", "license.txt", "copying", "copying.md"):
            return True
        if "license" in base and base.endswith(".md"):
            return True
    return False


def _has_workflow(paths: list[str]) -> bool:
    return any(p.startswith(".github/workflows/") for p in paths)


def _has_gitignore(paths: list[str]) -> bool:
    return any(p.lower() == ".gitignore" for p in paths)


def _has_security_policy(paths: list[str]) -> bool:
    return any(p.lower() in (".github/security.md", "security.md") for p in paths)


def _has_dockerfile(paths: list[str]) -> bool:
    for p in paths:
        pl = p.lower()
        if pl == "dockerfile" or pl.endswith("/dockerfile"):
            return True
        if pl == "docker-compose.yml" or pl == "docker-compose.yaml":
            return True
    return False


def _node_modules_committed(paths: list[str]) -> bool:
    return any(
        "node_modules/" in p.replace("\\", "/") and not p.startswith("node_modules/")
        for p in paths
    )


def _deep_java_style(paths: list[str]) -> bool:
    """Flag very deep trees outside vendor (heuristic)."""
    for p in paths:
        depth = p.count("/")
        if depth >= 12 and "/vendor/" not in p.lower():
            return True
    return False


async def run(ctx: RepoContext) -> AnalyzerResult:
    paths = ctx.tree_paths
    findings: list[Finding] = []

    if not _has_readme(paths):
        findings.append(
            Finding(
                id="missing-readme",
                category="documentation",
                severity=Severity.MEDIUM,
                title="No README found",
                detail="Add a README so contributors and users understand setup, scope, and how to run the project.",
            )
        )

    if not _has_license(paths):
        findings.append(
            Finding(
                id="missing-license",
                category="legal",
                severity=Severity.MEDIUM,
                title="No license file detected",
                detail="Open source repos should include a LICENSE file to clarify usage rights.",
            )
        )

    if not _has_gitignore(paths):
        findings.append(
            Finding(
                id="missing-gitignore",
                category="hygiene",
                severity=Severity.HIGH,
                title="Missing .gitignore",
                detail="Without .gitignore, build artifacts and secrets are more likely to be committed accidentally.",
            )
        )

    manifest_markers = ("package.json", "pyproject.toml", "cargo.toml", "go.mod", "gemfile", "composer.json")
    if not _has_workflow(paths) and any(
        any(p.lower().endswith(m) or p.lower() == m for p in paths) for m in manifest_markers
    ):
        findings.append(
            Finding(
                id="missing-ci",
                category="ci",
                severity=Severity.MEDIUM,
                title="No GitHub Actions workflows found",
                detail="Consider adding CI to run tests and lint on every push or PR.",
            )
        )

    if not _has_security_policy(paths) and (ctx.meta.get("stargazers_count") or 0) > 10:
        findings.append(
            Finding(
                id="missing-security-policy",
                category="security",
                severity=Severity.LOW,
                title="No SECURITY.md policy",
                detail="Add .github/SECURITY.md to guide reporters of vulnerabilities.",
            )
        )

    if _node_modules_committed(paths):
        findings.append(
            Finding(
                id="node-modules-committed",
                category="structure",
                severity=Severity.HIGH,
                title="node_modules appears tracked in the tree",
                detail="Dependencies should usually be installed locally or in CI — not committed.",
            )
        )

    if _deep_java_style(paths):
        findings.append(
            Finding(
                id="deep-tree",
                category="structure",
                severity=Severity.LOW,
                title="Very deep directory paths detected",
                detail="Extremely deep trees can signal generated code or organizational issues; consider flattening or splitting packages.",
            )
        )

    if ctx.tree_truncated:
        findings.append(
            Finding(
                id="tree-truncated",
                category="github",
                severity=Severity.MEDIUM,
                title="GitHub tree listing was truncated",
                detail="This repository is large; analysis may miss files beyond GitHub's recursive tree limits.",
            )
        )

    data = {
        "has_readme": _has_readme(paths),
        "has_license": _has_license(paths),
        "has_gitignore": _has_gitignore(paths),
        "has_ci": _has_workflow(paths),
        "has_docker": _has_dockerfile(paths),
        "language": ctx.meta.get("language"),
    }
    return AnalyzerResult(analyzer="repo_structure", findings=findings, data=data)
