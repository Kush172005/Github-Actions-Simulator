import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchActionRuns, postAnalyzeRun } from "../lib/api.js";
import { parseRepoInput } from "../lib/repoInput.js";
import { safePlainText } from "../lib/sanitize.js";
import { DashboardLayout } from "../components/dashboard/DashboardLayout.jsx";
import { ScanningScreen } from "../components/analyze/ScanningScreen.jsx";
import { RunList } from "../components/runs/RunList.jsx";
import { RunReport } from "../components/runs/RunReport.jsx";

const ghClientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
const redirectUri =
  import.meta.env.VITE_GITHUB_REDIRECT_URI ||
  `${window.location.origin}/auth/callback/github`;

function runCacheKey(fullName, runId) {
  return `shipstack_run_analyze_v1:${fullName}:${runId}`;
}

function runListCacheKey(fullName) {
  return `shipstack_runs_list_v1:${fullName}`;
}

const RUN_SCAN_MESSAGES = [
  "Fetching workflow run details…",
  "Downloading targeted job logs…",
  "Building repository context…",
  "Running static analyzers…",
  "Detecting failure correlations…",
  "Generating AI diagnosis…",
  "Structuring run report…",
];

export default function RunsPage() {
  const { user, loading, logout } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const repoParam = params.get("repo") || "";

  const parsed = useMemo(() => parseRepoInput(repoParam), [repoParam]);
  const owner = parsed.ok ? parsed.owner : null;
  const repo = parsed.ok ? parsed.repo : null;
  const fullName = parsed.ok ? parsed.full_name : null;

  // Repo picker (when landing without ?repo=)
  const [repoInput, setRepoInput] = useState(repoParam);

  useEffect(() => {
    setRepoInput(repoParam);
  }, [repoParam]);

  // List state
  // List state
  const [listStatus, setListStatus] = useState("idle");
  const [runs, setRuns] = useState(null);
  const [listError, setListError] = useState(null);
  const [listRefresh, setListRefresh] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // Report state
  const [selectedRun, setSelectedRun] = useState(null);
  const [reportStatus, setReportStatus] = useState("idle");
  const [reportData, setReportData] = useState(null);
  const [reportError, setReportError] = useState(null);

  const listAbortRef = useRef(null);
  const reportAbortRef = useRef(null);
  const reportRef = useRef(null);

  const connectGitHub = useCallback(() => {
    if (!ghClientId) return;
    const p = new URLSearchParams({
      client_id: ghClientId,
      redirect_uri: redirectUri,
      scope: "repo read:user user:email",
    });
    window.location.href = `https://github.com/login/oauth/authorize?${p.toString()}`;
  }, []);

  const goToRepo = useCallback(
    (raw) => {
      const p = parseRepoInput(raw);
      if (!p.ok) return;
      // Reset report when switching repos
      reportAbortRef.current?.abort();
      setSelectedRun(null);
      setReportStatus("idle");
      setReportData(null);
      setReportError(null);
      navigate(`/dashboard/runs?repo=${encodeURIComponent(p.full_name)}`, { replace: false });
    },
    [navigate],
  );

  // Load run list when owner/repo are valid (page 1 / refresh)
  useEffect(() => {
    if (!user || !owner || !repo || !fullName) {
      setListStatus("idle");
      setRuns(null);
      setListError(null);
      setPage(1);
      setHasMore(false);
      setTotalCount(0);
      return;
    }

    listAbortRef.current?.abort();
    const ac = new AbortController();
    listAbortRef.current = ac;

    const cacheKey = runListCacheKey(fullName);
    if (listRefresh === 0) {
      const cachedRaw = sessionStorage.getItem(cacheKey);
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw);
          if (Date.now() - cached.ts < 5 * 60 * 1000 && Array.isArray(cached.runs)) {
            setRuns(cached.runs);
            setPage(cached.page || 1);
            setHasMore(Boolean(cached.has_more));
            setTotalCount(cached.total_count || cached.runs.length);
            setListStatus("success");
            setListError(null);
            return () => ac.abort();
          }
        } catch {
          // ignore stale cache
        }
      }
    } else {
      try {
        sessionStorage.removeItem(cacheKey);
      } catch {
        // ignore
      }
    }

    setListStatus("loading");
    setRuns(null);
    setListError(null);
    setPage(1);
    setHasMore(false);
    setTotalCount(0);
    setLoadingMore(false);

    fetchActionRuns(owner, repo, { signal: ac.signal, page: 1 })
      .then((data) => {
        if (ac.signal.aborted) return;
        const nextRuns = data.runs || [];
        setRuns(nextRuns);
        setPage(data.page || 1);
        setHasMore(Boolean(data.has_more));
        setTotalCount(data.total_count || nextRuns.length);
        setListStatus("success");
        try {
          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({
              runs: nextRuns,
              page: data.page || 1,
              has_more: Boolean(data.has_more),
              total_count: data.total_count || nextRuns.length,
              ts: Date.now(),
            }),
          );
        } catch {
          // ignore
        }
      })
      .catch((e) => {
        if (e.name === "AbortError" || ac.signal.aborted) return;
        setListError(e.message || "Failed to load runs");
        setListStatus("error");
      });

    return () => ac.abort();
  }, [owner, repo, fullName, user, listRefresh]);

  const retryList = useCallback(() => {
    setListRefresh((n) => n + 1);
  }, []);

  const loadMoreRuns = useCallback(async () => {
    if (!owner || !repo || !fullName || !hasMore || loadingMore) return;

    const nextPage = page + 1;
    setLoadingMore(true);
    setListError(null);
    try {
      const data = await fetchActionRuns(owner, repo, { page: nextPage });
      const nextBatch = data.runs || [];
      setRuns((prev) => {
        const seen = new Set((prev || []).map((r) => r.id));
        const merged = [...(prev || [])];
        for (const r of nextBatch) {
          if (!seen.has(r.id)) merged.push(r);
        }
        try {
          sessionStorage.setItem(
            runListCacheKey(fullName),
            JSON.stringify({
              runs: merged,
              page: data.page || nextPage,
              has_more: Boolean(data.has_more),
              total_count: data.total_count || merged.length,
              ts: Date.now(),
            }),
          );
        } catch {
          // ignore
        }
        return merged;
      });
      setPage(data.page || nextPage);
      setHasMore(Boolean(data.has_more));
      setTotalCount(data.total_count || 0);
    } catch (e) {
      if (e.name !== "AbortError") {
        setListError(e.message || "Failed to load more runs");
      }
    } finally {
      setLoadingMore(false);
    }
  }, [owner, repo, fullName, hasMore, loadingMore, page]);

  const analyzeRun = useCallback(
    async (run) => {
      if (!fullName || !run?.id) return;

      const runId = run.id;
      const cacheKey = runCacheKey(fullName, runId);
      const cachedRaw = sessionStorage.getItem(cacheKey);
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw);
          setSelectedRun(run);
          setReportData(cached);
          setReportStatus("success");
          setReportError(null);
          setTimeout(() => reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
          return;
        } catch {
          // ignore
        }
      }

      reportAbortRef.current?.abort();
      const ac = new AbortController();
      reportAbortRef.current = ac;

      setSelectedRun(run);
      setReportStatus("loading");
      setReportData(null);
      setReportError(null);

      try {
        const result = await postAnalyzeRun(
          { full_name: fullName, run_id: runId },
          { signal: ac.signal },
        );
        if (ac.signal.aborted) return;
        setReportData(result);
        setReportStatus("success");
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(result));
        } catch {
          // ignore
        }
        setTimeout(() => reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      } catch (e) {
        if (e.name === "AbortError") return;
        setReportStatus("error");
        setReportError(e.message || "Run analysis failed");
      }
    },
    [fullName],
  );

  const handleBack = useCallback(() => {
    reportAbortRef.current?.abort();
    setSelectedRun(null);
    setReportStatus("idle");
    setReportData(null);
    setReportError(null);
  }, []);

  useEffect(
    () => () => {
      listAbortRef.current?.abort();
      reportAbortRef.current?.abort();
    },
    [],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b] text-zinc-400">
        <span className="h-8 w-8 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const showReport =
    selectedRun &&
    (reportStatus === "loading" || reportStatus === "success" || reportStatus === "error");

  const pickerParsed = parseRepoInput(repoInput);

  return (
    <DashboardLayout user={user} onLogout={logout} onConnectGitHub={connectGitHub}>
      {/* Breadcrumb */}
      <div className="mb-6 flex flex-wrap items-center gap-3 text-xs">
        <Link
          to="/dashboard"
          className="rounded-lg border border-white/[0.08] px-3 py-1.5 font-medium text-zinc-400 no-underline transition hover:border-emerald-500/25 hover:text-zinc-200"
        >
          Repositories
        </Link>
        <span className="text-zinc-600">/</span>
        {fullName && (
          <>
            <Link
              to={`/dashboard/analyze?repo=${encodeURIComponent(fullName)}`}
              className="font-medium text-zinc-500 no-underline transition hover:text-zinc-300"
            >
              {safePlainText(fullName)}
            </Link>
            <span className="text-zinc-600">/</span>
          </>
        )}
        <span className="font-semibold text-zinc-200">Actions Runs</span>
      </div>

      {/* Repo identity / picker header */}
      <section
        className="glass-card mb-8 rounded-2xl border border-white/[0.06] p-5 sm:p-6"
        style={{ background: "rgba(24,24,27,0.55)" }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              GitHub Actions
            </p>
            <h2 className="mt-1 font-mono text-lg font-bold text-white">
              {fullName ? safePlainText(fullName) : "Actions runs"}
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              {fullName
                ? "Recent workflow executions — select any completed run to analyze it."
                : "Choose a repository to inspect recent CI/CD runs."}
            </p>

            {/* Always allow switching / selecting a repo */}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && pickerParsed.ok) goToRepo(repoInput);
                }}
                placeholder="owner/repo or github.com/owner/repo"
                className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-4 py-2.5 font-mono text-sm text-zinc-100 outline-none transition focus:border-emerald-500/35 focus:ring-2 focus:ring-emerald-500/20 sm:max-w-md"
              />
              <button
                type="button"
                disabled={!pickerParsed.ok}
                onClick={() => goToRepo(repoInput)}
                className="shrink-0 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-950 shadow-lg shadow-emerald-500/15 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
              >
                Load runs
              </button>
            </div>
            {repoInput.trim() && !pickerParsed.ok && (
              <p className="mt-2 text-xs text-amber-400/90">
                {safePlainText(pickerParsed.error || "Invalid repository")}
              </p>
            )}
          </div>
          {fullName && (
            <div className="flex gap-2 sm:shrink-0">
              <Link
                to={`/dashboard/analyze?repo=${encodeURIComponent(fullName)}`}
                className="inline-flex items-center rounded-lg border border-white/[0.08] px-3 py-1.5 text-[11px] font-semibold text-zinc-400 no-underline transition hover:border-emerald-500/25 hover:text-zinc-200"
              >
                Static audit →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* GitHub not connected */}
      {!user.github_connected && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-4 text-sm text-amber-300">
          Connect your GitHub account to view Actions runs.
          <button
            type="button"
            onClick={connectGitHub}
            className="ml-3 text-xs font-semibold underline hover:text-amber-200"
          >
            Connect GitHub
          </button>
        </div>
      )}

      {/* Main content when repo is selected */}
      {user.github_connected && fullName && (
        <>
          {!showReport && (
            <>
              {listStatus === "loading" && (
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400" />
                  Loading runs…
                </div>
              )}
              {listStatus === "error" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                >
                  {safePlainText(listError)}
                  <button
                    type="button"
                    onClick={retryList}
                    className="ml-3 text-xs font-semibold underline hover:text-white"
                  >
                    Retry
                  </button>
                </motion.div>
              )}
              {listStatus === "success" && runs && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  {listError && (
                    <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {safePlainText(listError)}
                    </div>
                  )}
                  {runs.length === 0 ? (
                    <div className="rounded-xl border border-white/[0.05] bg-zinc-900/30 py-16 text-center">
                      <p className="text-sm text-zinc-500">
                        No GitHub Actions runs found for this repository.
                      </p>
                      <p className="mt-2 text-xs text-zinc-600">
                        GitHub Actions may not be enabled, or no workflows have run yet.
                      </p>
                    </div>
                  ) : (
                    <RunList
                      runs={runs}
                      onSelect={analyzeRun}
                      hasMore={hasMore}
                      loadingMore={loadingMore}
                      totalCount={totalCount}
                      onLoadMore={loadMoreRuns}
                    />
                  )}
                </motion.div>
              )}
            </>
          )}

          {showReport && (
            <div ref={reportRef} className="scroll-mt-24">
              {reportStatus === "loading" && selectedRun && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <ScanningScreen
                    repositoryName={fullName}
                    refBranch={selectedRun.head_branch || ""}
                    statusMessages={RUN_SCAN_MESSAGES}
                  />
                </motion.div>
              )}

              {reportStatus === "error" && reportError && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                >
                  <div className="mb-3">{safePlainText(reportError)}</div>
                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-xs font-semibold text-zinc-300 hover:text-white"
                  >
                    ← Back to runs
                  </button>
                </motion.div>
              )}

              {reportStatus === "success" && reportData && (
                <RunReport data={reportData} onBack={handleBack} />
              )}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
