# GitHub Actions Run Analysis — Interview Guide

> **Purpose of this doc:** Your go-to reference for explaining ShipStack’s Actions Run Analysis feature in interviews. Read this end-to-end once; then use the file map and Q&A sections when someone asks “walk me through X” or “open that file.”

---

## 1. One-sentence pitch

ShipStack does not only audit workflow **files** statically — it can also pull a **completed** GitHub Actions run, fetch targeted job logs, correlate them with the repo’s static findings (YAML + deps), and return a root-cause diagnosis with an exact fix.

---

## 2. What already existed before this feature

| Piece | What it did | What it did *not* do |
|---|---|---|
| Static workflow analyzer (`workflows.py`) | Parse `.github/workflows/*.yml`, flag unpinned actions, missing cache, etc. | Never looked at real run results |
| Paste-log feature (`ci_logs` on `/analyze`) | User pastes terminal output → AI explains it | Never fetched logs from GitHub |
| Repo analyze (`POST /api/analyze`) | Tree + blobs → analyzers → AI insights | No run IDs, no jobs/steps API |
| OAuth (`repo` scope) | Access private repos + contents | Already enough for Actions read — no new scope needed |

**Product gap:** Users still had to leave ShipStack, open GitHub Actions UI, copy logs, paste them back. The new feature closes that loop.

---

## 3. What we built (user-facing)

### Flow

1. User connects GitHub and picks a repo (dashboard card, modal, Analyze CTA, or Actions nav).
2. Opens `/dashboard/runs?repo=owner/name`.
3. ShipStack lists recent workflow runs (15 per page, with **Load more** pagination).
4. User clicks a **completed** run (in-progress runs are not analyzable).
5. Scanning screen while backend works.
6. Report shows:
   - Root cause + confidence
   - Affected job / step
   - Exact copyable fix
   - Correlations (static finding ↔ runtime failure)
   - What worked / warnings
   - Expandable jobs → steps tree

### What we deliberately did *not* build

- Live log streaming (only completed runs).
- Dumping entire logs into the LLM (too large, noisy, expensive).
- A second LLM provider (reuse OpenRouter → HuggingFace chain).
- New paid infra (no Redis, no queue, no Mongo history for runs).
- Replacing or breaking existing `/analyze` + paste-log.

---

## 4. Why this design (interview-ready reasons)

### Why a sibling page (`/dashboard/runs`) instead of stuffing into Analyze?

Analyze is already a dense “static audit + optional paste” screen. Mixing “pick a run” into it would overload UX and risk regressions. Sibling route keeps mental model clean: **static audit** vs **runtime run diagnosis**.

### Why 15 runs per page + Load more?

One GitHub API call returns one page. 15 is enough to scan recent activity without burning rate limits. Pagination uses GitHub’s `page` + `total_count` so users can go deeper when needed.

### Why only completed runs?

In-progress runs have incomplete jobs/logs. Streaming is a different product. Rejecting non-completed runs with a clear 400 keeps the MVP honest and simple.

### Why fetch logs only for failed/cancelled jobs (max 2)?

Successful green runs don’t need multi-MB log archives. Failed jobs carry the signal. Cap of 2 keeps API + AI payload bounded.

### Why deterministic log extraction before AI?

Raw CI logs are huge and full of noise. We:

1. Trust **jobs API** for “which job/step failed” (authoritative).
2. Strip ANSI codes.
3. Extract head + error windows + tail (`log_extract.py`).
4. Only then call the LLM with a **budgeted JSON payload**.

Value = **correlation**, not “chat with logs.”

### Why correlate with static analyzers at `head_sha`?

Example story you can tell in interviews:

> Static analysis sees `package.json` engines require Node ≥20, but the workflow YAML pins Node 18. The failed run’s log says unsupported engine. ShipStack links those facts and recommends the exact YAML change.

We resolve the run’s **commit SHA** (not just branch tip) so analysis matches what actually ran.

### Why partial success if AI fails?

GitHub data (jobs/steps) is still useful. Prefer returning `diagnosis: null` + `ai_warning` over a hard 502 that wastes a slow fetch.

### Why sessionStorage only?

Same pattern as analyze/repos. No new DB collection. Short TTL on run lists (5 min). Full report cached per `full_name:run_id`.

---

## 5. End-to-end data flow

```
Browser  →  GET /api/github/repos/{owner}/{repo}/actions/runs?page=N
         ←  { runs[], page, per_page, total_count, has_more }

Browser  →  POST /api/analyze/run  { full_name, run_id }
Backend:
  1. get_workflow_run          → must be status=completed
  2. list_jobs_for_run         → jobs + steps
  3. download_job_logs (≤2 failed jobs) → strip_ansi → extract_log_signals
  4. build_repo_context(ref=head_sha) → tree + key files
  5. run_pipeline              → same 3 analyzers (structure, workflows, deps)
  6. build correlation payload (≤~48KB)
  7. AIClient.explain_run()    → OpenRouter then HF fallback
  8. Return RunAnalyzeResponse (diagnosis may be null if AI fails)
```

**Auth:** JWT → user doc → `github_access_token` → GitHub REST. Same OAuth token as the rest of the app.

---

## 6. API surface (memorize these)

| Method | Path | Auth | Body / query | Response |
|---|---|---|---|---|
| `GET` | `/api/github/repos/{owner}/{repo}/actions/runs` | JWT + GitHub token | `?page=1` | Paginated runs |
| `POST` | `/api/analyze/run` | JWT + GitHub token + AI key | `{ full_name \| repo_url, run_id }` | Full run report |

**Untouched (must say this if asked about regressions):**

- `POST /api/analyze` — same request/response as before
- Paste `ci_logs` path still works
- OAuth scopes unchanged: `repo read:user user:email`

### GitHub APIs we call

| Call | Purpose |
|---|---|
| `GET .../actions/runs?per_page=&page=` | List runs |
| `GET .../actions/runs/{id}` | Run detail |
| `GET .../actions/runs/{id}/jobs?filter=latest` | Jobs + steps |
| `GET .../actions/jobs/{id}/logs` | Job log text (404 = expired ~90 days) |
| Existing contents APIs | Repo context at commit SHA |

No Octokit / PyGithub — raw `httpx` like the rest of ShipStack.

---

## 7. File map (if they say “open the file”)

### Backend — new

| File | Role |
|---|---|
| `server/app/services/github_actions.py` | Runs / jobs / log download + slim dataclasses |
| `server/app/engines/log_extract.py` | Deterministic error-window extraction |
| `server/app/engines/run_engine.py` | Orchestrates fetch → analyze → correlate → AI |
| `server/app/schemas/run_analyze.py` | Request/response Pydantic models |

### Backend — modified

| File | What changed |
|---|---|
| `server/app/routers/github.py` | `GET .../actions/runs` + page validation |
| `server/app/routers/analyze.py` | `POST /analyze/run` (does **not** change `/analyze`) |
| `server/app/ai/prompts.py` | `RUN_SYSTEM` + `run_user_payload` |
| `server/app/ai/schemas.py` | `RunDiagnosis`, `CorrelationItem` |
| `server/app/ai/sanitize.py` | `sanitize_run_diagnosis` |
| `server/app/ai/client.py` | `explain_run()` — same provider chain |
| `server/app/config.py` | `actions_runs_per_page`, `actions_max_job_logs`, log archive byte cap |
| `server/app/analyzers/context_builder.py` | Can resolve a **commit SHA** (not only branch name) |
| `server/app/services/github_contents.py` | `get_commit_tree_sha`, `looks_like_commit_sha` |

### Frontend — new

| File | Role |
|---|---|
| `client/src/pages/RunsPage.jsx` | List + analyze + cache + pagination + repo picker |
| `client/src/components/runs/RunList.jsx` | Filters + Load more |
| `client/src/components/runs/RunRow.jsx` | One run row |
| `client/src/components/runs/RunReport.jsx` | Summary-first report UI |
| `client/src/components/runs/JobStepsPanel.jsx` | Expandable jobs/steps |

### Frontend — modified

| File | What changed |
|---|---|
| `client/src/App.jsx` | Route `/dashboard/runs` |
| `client/src/lib/api.js` | `fetchActionRuns`, `postAnalyzeRun` |
| `client/src/lib/repoInput.js` | Returns `owner` + `repo` + `full_name` (bugfix for undefined/undefined) |
| `client/src/components/dashboard/DashboardLayout.jsx` | Actions nav link |
| `client/src/components/dashboard/RepoCard.jsx` | Lightning → runs |
| `client/src/components/dashboard/RepoPreviewModal.jsx` | Actions Runs CTA |
| `client/src/pages/AnalyzePage.jsx` | Link out to Actions runs |
| `client/src/components/analyze/ScanningScreen.jsx` | Optional `statusMessages` for run scan copy |

---

## 8. Key algorithms / logic (be ready to explain)

### Log extraction (`log_extract.py`)

- Short logs: return as-is (within char budget).
- Long logs: **SETUP/HEAD** (first ~60 lines) + **ERROR CONTEXT** windows around regex hits (`##[error]`, `npm ERR!`, `exit code`, TS errors, etc.) + **TAIL** (last ~100 lines).
- Hard max chars with head+tail truncate if still too big.

### Job log selection (`run_engine.py`)

Priority: jobs with conclusion in `{failure, cancelled, timed_out}` → take up to `actions_max_job_logs` (2). Skip skipped jobs for download. If logs 404 → `logs_available=false`, still analyze from structure + static findings, lower AI confidence via prompt rules.

### Candidate correlation (deterministic hint)

Example: regex `node-version` in workflow YAML vs `engines.node` / `volta.node` in `package.json`. If workflow major &lt; required major → inject a `candidate_correlations` hint into the AI payload so the model can cite it confidently.

### AI prompt (`RUN_SYSTEM`)

Same injection rules as other prompts: treat logs and file contents as **DATA**. Output strict JSON: root_cause, explanation, fix, confidence, affected_job/step, what_worked, warnings, correlations.

---

## 9. Edge cases we handled (great interview answers)

| Situation | Behavior |
|---|---|
| Run still running | UI disables analyze; API returns 400 |
| Logs expired (90 days) | Banner; diagnose from jobs + static only |
| Huge logs | Caps + extract; never full dump to LLM |
| AI all models fail | Partial response: jobs tree + `ai_warning` |
| Branch deleted after run | Fall back from SHA → branch → default |
| No Actions / empty | Friendly empty state |
| Rate limit 429 | Mapped like other GitHub errors |
| Nav to `/dashboard/runs` with no `?repo=` | Repo picker input (don’t call API with undefined) |
| Bug: `owner`/`repo` undefined | Fixed by returning owner/repo from `parseRepoInput` |

---

## 10. Bugs we hit while building (honesty = credibility)

1. **`/repos/undefined/undefined/actions/runs`**  
   Cause: `parseRepoInput` only returned `full_name`; RunsPage destructured `owner`/`repo`.  
   Fix: return all three fields; guard API client; validate on backend.

2. **Only 15 runs, no way to see older ones**  
   Cause: MVP single page.  
   Fix: GitHub `page` query + `total_count` + frontend Load more with append + cache update.

3. **Context at branch tip vs commit that ran**  
   Fix: `looks_like_commit_sha` + `get_commit_tree_sha` so run analysis pins to `head_sha`.

---

## 11. Config knobs

| Setting | Default | Meaning |
|---|---|---|
| `actions_runs_per_page` | 15 | Page size for list endpoint |
| `actions_max_job_logs` | 2 | Max failed jobs to download logs for |
| `actions_max_log_archive_bytes` | 5_000_000 | Cap per job log download |
| `analyze_max_ci_log_chars` | 120_000 | Shared char budget (also used after extract) |

---

## 12. How to demo in an interview (2–3 minutes)

1. Open dashboard → pick a repo with Actions history → **Actions** / lightning icon.
2. Show filters (All / Failed / Success / Cancelled) and **Load more**.
3. Click a **failed** completed run → scanning screen → report.
4. Point at: affected step, root cause, copyable fix, correlation card if present, jobs accordion.
5. Say: “Static audit is still on `/dashboard/analyze`; paste-log still works; this path auto-fetches GitHub run data and correlates.”

Optional: open `run_engine.py` and walk the numbered steps in `analyze_run`.

---

## 13. Likely interview questions + short answers

**Q: Why not stream logs?**  
A: Different complexity (websockets, partial state). MVP targets completed runs where diagnosis is stable.

**Q: Why not send full logs to the model?**  
A: Cost, latency, context limits, noise. Deterministic extract preserves signal; jobs API already knows *where* it failed.

**Q: How do you avoid breaking existing analyze?**  
A: New endpoints only. No new required fields on `POST /analyze`. Shared AI client methods are additive (`explain_run`).

**Q: What permissions do you need?**  
A: Classic OAuth `repo` already covers Actions for accessible private repos. We didn’t add scopes.

**Q: How do you handle rate limits?**  
A: Paginated list (one call per page), max 2 log downloads per analyze, sessionStorage cache, map HTTP 429 to a clear error.

**Q: What’s the hardest part?**  
A: Correlation — combining runtime evidence with static YAML/deps into one confident diagnosis without drowning the model in raw logs.

**Q: What would you build next?**  
A: Persist run reports in Mongo, webhook on `workflow_run`, deeper annotation/check-run enrichment, optional background job for slow analyzes.

---

## 14. Mental checklist before the interview

- [ ] Can draw the flow: list → select → fetch jobs/logs → analyzers → AI → report  
- [ ] Can name `run_engine.py`, `github_actions.py`, `log_extract.py`, `RunsPage.jsx`  
- [ ] Can explain why sibling route + completed-only + extract-before-AI  
- [ ] Can tell the Node version mismatch correlation story  
- [ ] Can mention the `undefined/undefined` bug and how we fixed it  
- [ ] Can say what we did **not** change (`POST /analyze`, paste logs, OAuth)

---

*Last updated for the Actions Run Analysis MVP shipped on top of ShipStack’s existing static audit + paste-log product.*
