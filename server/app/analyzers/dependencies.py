"""Dependency manifest / lockfile analyzer with light registry checks."""

from __future__ import annotations

import json
import re
from typing import Any

import httpx

from app.analyzers.types import AnalyzerResult, Finding, RepoContext, Severity


def _parse_json(path: str, content: str) -> Any:
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return None


async def _npm_latest_version(client: httpx.AsyncClient, name: str) -> str | None:
    url = f"https://registry.npmjs.org/{name.replace('/', '%2F')}/latest"
    try:
        r = await client.get(url, timeout=15.0)
        if r.status_code != 200:
            return None
        data = r.json()
        v = data.get("version")
        return str(v) if v else None
    except Exception:
        return None


def _py_latest_from_pypi_json(data: dict) -> str | None:
    info = data.get("info") or {}
    v = info.get("version")
    return str(v) if v else None


async def _pypi_latest_version(client: httpx.AsyncClient, name: str) -> str | None:
    url = f"https://pypi.org/pypi/{name}/json"
    try:
        r = await client.get(url, timeout=15.0)
        if r.status_code != 200:
            return None
        return _py_latest_from_pypi_json(r.json())
    except Exception:
        return None


def _norm_ver(v: str) -> str:
    return re.sub(r"^[\^~>=<]+\s*", "", v.strip()).strip()


async def run(ctx: RepoContext, http_client: httpx.AsyncClient) -> AnalyzerResult:
    findings: list[Finding] = []
    data: dict[str, Any] = {"ecosystems": []}

    pkg_paths = [p for p in ctx.files if p.lower().endswith("package.json")]
    lock_npm = any(
        p.lower().endswith("package-lock.json") or p.lower().endswith("npm-shrinkwrap.json")
        for p in ctx.tree_paths
    )
    lock_yarn = any(p.lower().endswith("yarn.lock") for p in ctx.tree_paths)
    lock_pnpm = any(p.lower().endswith("pnpm-lock.yaml") for p in ctx.tree_paths)

    for p in pkg_paths:
        doc = _parse_json(p, ctx.files.get(p) or "")
        if not isinstance(doc, dict):
            findings.append(
                Finding(
                    id="package-json-invalid",
                    category="dependencies",
                    severity=Severity.HIGH,
                    title="package.json is not valid JSON",
                    detail="Fix JSON syntax so tooling and CI can read the manifest.",
                    path=p,
                )
            )
            continue

        deps = doc.get("dependencies") if isinstance(doc.get("dependencies"), dict) else {}
        dev = doc.get("devDependencies") if isinstance(doc.get("devDependencies"), dict) else {}
        if (deps or dev) and not (lock_npm or lock_yarn or lock_pnpm):
            findings.append(
                Finding(
                    id="missing-frontend-lockfile",
                    category="dependencies",
                    severity=Severity.HIGH,
                    title="No lockfile for a Node manifest",
                    detail="Commit package-lock.json, yarn.lock, or pnpm-lock.yaml so installs are reproducible.",
                    path=p,
                )
            )

        # Outdated check (bounded)
        combined = {**deps, **dev}
        keys = list(combined.keys())[:12]
        outdated_rows: list[dict[str, str]] = []
        for name in keys:
            want = combined.get(name)
            if not isinstance(want, str):
                continue
            latest = await _npm_latest_version(http_client, name)
            if not latest:
                continue
            pinned = _norm_ver(want)
            if pinned and latest != pinned and not pinned.startswith("file:") and not pinned.startswith("git+"):
                # semver-aware minimal: flag if not exact match and not workspace protocol
                if "*" not in pinned and pinned != latest:
                    outdated_rows.append({"name": name, "declared": want, "latest": latest})

        if outdated_rows:
            findings.append(
                Finding(
                    id="npm-outdated",
                    category="dependencies",
                    severity=Severity.MEDIUM,
                    title="Some npm dependencies appear behind latest",
                    detail=f"Examples: {', '.join(r['name'] + '@' + r['declared'] + ' (latest ' + r['latest'] + ')' for r in outdated_rows[:5])}",
                    path=p,
                    evidence={"rows": outdated_rows[:20]},
                )
            )

        data["ecosystems"].append({"type": "node", "path": p, "dependency_count": len(combined)})

    req_txt = next((ctx.files[p] for p in ctx.files if p.lower() == "requirements.txt"), None)
    if req_txt:
        lines = [ln.strip() for ln in req_txt.splitlines() if ln.strip() and not ln.strip().startswith("#")]
        unpinned = [ln for ln in lines if "==" not in ln and not ln.lower().startswith("-r")]
        if unpinned:
            findings.append(
                Finding(
                    id="requirements-unpinned",
                    category="dependencies",
                    severity=Severity.MEDIUM,
                    title="requirements.txt mixes unpinned dependencies",
                    detail="Pin versions with == (or use a lock workflow) for reproducible environments.",
                    path="requirements.txt",
                    evidence={"examples": unpinned[:8]},
                )
            )
        names = []
        for ln in lines:
            m = re.match(r"^([a-zA-Z0-9_.\-]+)", ln)
            if m:
                names.append(m.group(1).lower().replace("_", "-"))
        outdated_py: list[dict[str, str]] = []
        for name in names[:10]:
            latest = await _pypi_latest_version(http_client, name)
            if not latest:
                continue
            # if line pins == compare
            pin_line = next((x for x in lines if x.lower().startswith(name + "==")), None)
            if pin_line:
                cur = pin_line.split("==", 1)[-1].strip()
                if cur and cur != latest:
                    outdated_py.append({"name": name, "pinned": cur, "latest": latest})
        if outdated_py:
            findings.append(
                Finding(
                    id="pypi-outdated",
                    category="dependencies",
                    severity=Severity.MEDIUM,
                    title="Some Python packages appear behind PyPI latest",
                    detail="Examples: "
                    + ", ".join(
                        f"{r['name']} {r['pinned']} → {r['latest']}" for r in outdated_py[:5]
                    ),
                    path="requirements.txt",
                    evidence={"rows": outdated_py[:20]},
                )
            )
        data["ecosystems"].append({"type": "python", "path": "requirements.txt", "line_count": len(lines)})

    pyproject = next((ctx.files[p] for p in ctx.files if p.lower() == "pyproject.toml"), None)
    if pyproject and "poetry" in pyproject.lower() and not any(
        p.lower() == "poetry.lock" for p in ctx.tree_paths
    ):
        findings.append(
            Finding(
                id="missing-poetry-lock",
                category="dependencies",
                severity=Severity.MEDIUM,
                title="Poetry project without poetry.lock in tree",
                detail="Commit poetry.lock for reproducible installs unless this is a library with intentional ranges only.",
                path="pyproject.toml",
            )
        )

    return AnalyzerResult(analyzer="dependencies", findings=findings, data=data)
