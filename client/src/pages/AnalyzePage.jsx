import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";
import { postAnalyzeRepo } from "../lib/api.js";
import { cacheKey, parseRepoInput } from "../lib/repoInput.js";
import { safePlainText } from "../lib/sanitize.js";
import { DashboardLayout } from "../components/dashboard/DashboardLayout.jsx";
import { ScanningScreen } from "../components/analyze/ScanningScreen.jsx";
import { HealthScoreRing } from "../components/analyze/HealthScoreRing.jsx";
import { RiskBadge } from "../components/analyze/RiskBadge.jsx";
import { InsightCard } from "../components/analyze/InsightCard.jsx";
import { CriticalIssues } from "../components/analyze/CriticalIssues.jsx";
import { FixList } from "../components/analyze/FixList.jsx";
import { WorkflowSection } from "../components/analyze/WorkflowSection.jsx";
import { DependencySection } from "../components/analyze/DependencySection.jsx";
import { SetupGuide } from "../components/analyze/SetupGuide.jsx";
import { detectProjectStack } from "../lib/projectDetect.js";

const ghClientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
const redirectUri =
  import.meta.env.VITE_GITHUB_REDIRECT_URI ||
  `${window.location.origin}/auth/callback/github`;

export default function AnalyzePage() {
  const { user, loading, logout } = useAuth();
  const [params] = useSearchParams();
  const prefill = params.get("repo") || "";

  const [input, setInput] = useState(prefill);
  const [debounced, setDebounced] = useState(prefill);
  const [refBranch, setRefBranch] = useState("");
  const [ciLogs, setCiLogs] = useState("");

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [cachedAnalysis, setCachedAnalysis] = useState(null);

  const parsed = useMemo(() => parseRepoInput(debounced), [debounced]);

  // Check for cached analysis on changes to repository or branch
  useEffect(() => {
    if (parsed.ok) {
      const key = cacheKey(parsed.full_name, refBranch);
      const raw = sessionStorage.getItem(key);
      if (raw) {
        try {
          const cached = JSON.parse(raw);
          setCachedAnalysis(cached);
          return;
        } catch {
          // ignore
        }
      }
    }
    setCachedAnalysis(null);
  }, [parsed, refBranch]);

  const stack = useMemo(() => {
    if (!data || !data.analyzers) return null;
    return detectProjectStack(data.analyzers);
  }, [data]);

  const stats = useMemo(() => {
    if (!data || !data.analyzers) return { criticalCount: 0, totalFindings: 0, fixCount: 0 };
    let criticalCount = 0;
    let totalFindings = 0;
    data.analyzers.forEach((a) => {
      if (a.findings) {
        totalFindings += a.findings.length;
        a.findings.forEach((f) => {
          if (f.severity === "critical" || f.severity === "high") {
            criticalCount++;
          }
        });
      }
    });
    return {
      criticalCount,
      totalFindings,
      fixCount: (data.fix_suggestions || []).length,
    };
  }, [data]);

  const abortRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    setInput(prefill);
    setDebounced(prefill);
  }, [prefill]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(input), 380);
    return () => clearTimeout(t);
  }, [input]);


  const connectGitHub = useCallback(() => {
    if (!ghClientId) return;
    const p = new URLSearchParams({
      client_id: ghClientId,
      redirect_uri: redirectUri,
      scope: "repo read:user user:email",
    });
    window.location.href = `https://github.com/login/oauth/authorize?${p.toString()}`;
  }, []);

  const runAnalyze = useCallback(
    async (opts = { skipCache: false }) => {
      if (!parsed.ok) {
        setError(parsed.error || "Invalid repository");
        return;
      }
      const full = parsed.full_name;
      const key = cacheKey(full, refBranch);
      if (!opts.skipCache && typeof sessionStorage !== "undefined") {
        const raw = sessionStorage.getItem(key);
        if (raw) {
          try {
            const cached = JSON.parse(raw);
            setData(cached);
            setCachedAnalysis(cached);
            setStatus("success");
            setError(null);
            requestAnimationFrame(() =>
              resultsRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              }),
            );
            return;
          } catch {
            /* ignore */
          }
        }
      }

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setStatus("loading");
      setData(null);
      setError(null);
      try {
        const body = {
          full_name: full,
          ref: refBranch.trim() || undefined,
          ci_logs: ciLogs.trim() || undefined,
        };
        const res = await postAnalyzeRepo(body, { signal: ac.signal });
        setData(res);
        setCachedAnalysis(res);
        setStatus("success");
        try {
          sessionStorage.setItem(key, JSON.stringify(res));
        } catch {
          /* ignore */
        }
        requestAnimationFrame(() =>
          resultsRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        );
      } catch (e) {
        if (e.name === "AbortError") return;
        setStatus("error");
        setError(e.message || "Analysis failed");
      }
    },
    [parsed, refBranch, ciLogs],
  );

  useEffect(() => () => abortRef.current?.abort(), []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b] text-zinc-400">
        <span className="h-8 w-8 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardLayout
      user={user}
      onLogout={logout}
      onConnectGitHub={connectGitHub}
    >
      <div className="mb-6 flex flex-wrap items-center gap-3 text-xs">
        <Link
          to="/dashboard"
          className="rounded-lg border border-white/[0.08] px-3 py-1.5 font-medium text-zinc-400 no-underline transition hover:border-emerald-500/25 hover:text-zinc-200"
        >
          Repositories
        </Link>
        <span className="text-zinc-600">/</span>
        <span className="font-semibold text-zinc-200">Analyze</span>
      </div>

      <section
        className="glass-card rounded-2xl border border-white/[0.06] p-5 sm:p-6"
        style={{ background: "rgba(24,24,27,0.55)" }}
      >
        <h2 className="text-lg font-semibold text-white">
          Repository intelligence
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Paste a GitHub URL or{" "}
          <span className="font-mono text-zinc-400">owner/repo</span>. JWT
          required; your linked GitHub token is used when available for private
          repos.
        </p>

        {cachedAnalysis && status !== "loading" && status !== "success" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left shadow-[0_0_20px_rgba(52,211,153,0.03)]"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] text-emerald-400 border border-emerald-500/30">
                ✓
              </span>
              <div>
                <p className="text-xs font-bold text-emerald-300">
                  Cached Audit Result Found
                </p>
                <p className="mt-1 text-[11px] text-zinc-400 leading-normal">
                  A previous security audit for this repository exists. Health Score:{" "}
                  <span className="font-mono font-bold text-white">
                    {cachedAnalysis.health_score}
                  </span>
                  /100 · Risk:{" "}
                  <span className={`font-bold ${
                    cachedAnalysis.risk_level === "high" ? "text-red-400" :
                    cachedAnalysis.risk_level === "medium" ? "text-amber-400" : "text-emerald-400"
                  }`}>
                    {(cachedAnalysis.risk_level || "unknown").toUpperCase()}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setData(cachedAnalysis);
                  setStatus("success");
                  setError(null);
                }}
                className="rounded-lg border border-white/[0.08] bg-zinc-900/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:border-white/20 hover:text-white transition active:scale-95"
              >
                Load Audit
              </button>
              <button
                type="button"
                onClick={() => runAnalyze({ skipCache: true })}
                className="rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-950 hover:opacity-95 shadow-sm transition active:scale-95"
              >
                Re-run Scan
              </button>
              <button
                type="button"
                onClick={() => {
                  const key = cacheKey(parsed.full_name, refBranch);
                  sessionStorage.removeItem(key);
                  setCachedAnalysis(null);
                }}
                title="Clear Cached Audit"
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/[0.04] hover:text-white transition"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}

        <div className="mt-5 grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Repository
            </label>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="https://github.com/vercel/next.js or vercel/next.js"
              className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-black/30 px-4 py-2.5 text-sm text-zinc-100 outline-none ring-emerald-500/0 transition focus:border-emerald-500/35 focus:ring-2 focus:ring-emerald-500/20"
            />
            {debounced && (
              <p
                className={`mt-2 text-xs ${parsed.ok ? "text-emerald-400/90" : "text-amber-400/90"}`}
              >
                {parsed.ok
                  ? `Ready: ${parsed.full_name}`
                  : safePlainText(parsed.error || "Invalid")}
              </p>
            )}
          </div>
          <div className="lg:col-span-5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Ref (optional)
            </label>
            <input
              value={refBranch}
              onChange={(e) => setRefBranch(e.target.value)}
              placeholder="main, master, or tag"
              className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-black/30 px-4 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-emerald-500/35"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            CI logs (optional)
          </label>
          <textarea
            value={ciLogs}
            onChange={(e) => setCiLogs(e.target.value)}
            rows={4}
            placeholder="Paste failing job logs for root-cause analysis"
            className="mt-1.5 w-full resize-y rounded-xl border border-white/[0.08] bg-black/30 px-4 py-2.5 text-xs text-zinc-100 outline-none transition focus:border-emerald-500/35"
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!parsed.ok || status === "loading"}
            onClick={() => runAnalyze({ skipCache: false })}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/15 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {status === "loading" ? "Cooking Analysis…" : "Run analysis"}
          </button>
          <button
            type="button"
            disabled={!parsed.ok || status === "loading"}
            onClick={() => runAnalyze({ skipCache: true })}
            className="rounded-xl border border-white/[0.1] px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-emerald-500/25 hover:text-white disabled:opacity-40"
          >
            Refresh (skip cache)
          </button>
        </div>
      </section>

      {status === "loading" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8"
        >
          <ScanningScreen
            repositoryName={parsed.full_name || "Repository"}
            refBranch={refBranch}
          />
        </motion.div>
      )}

      {status === "error" && error && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {safePlainText(error)}
        </motion.div>
      )}

      {status === "success" && data && (
        <motion.div
          ref={resultsRef}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 space-y-10 scroll-mt-24"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b border-white/[0.04] pb-6">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
              <HealthScoreRing score={data.health_score} />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-white font-mono">
                    {safePlainText(data.repository)}
                  </h2>
                  <RiskBadge level={data.risk_level} />
                  {stack && (
                    <span className="shrink-0 rounded-lg border border-white/[0.06] bg-zinc-900/60 px-2.5 py-0.5 text-[11px] font-semibold">
                      <span className={`bg-gradient-to-r ${stack.color} bg-clip-text text-transparent`}>
                        {stack.icon} {stack.name} Project
                      </span>
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  <span className="text-zinc-400">Default branch:</span>{" "}
                  {safePlainText(data.default_branch)} ·{" "}
                  <span className="text-zinc-400">Analyzed ref:</span>{" "}
                  {safePlainText(data.resolved_branch)} ·{" "}
                  <span className="font-mono text-zinc-500">
                    {safePlainText(data.commit_sha).slice(0, 7)}
                  </span>
                </p>
              </div>
            </div>

            {/* Quick Metrics Bar + Re-run Action */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto shrink-0">
              <div className="grid grid-cols-3 gap-3 w-full sm:w-auto">
                <div className="glass-card rounded-xl border border-white/[0.05] p-3 text-center bg-zinc-905/30 min-w-[90px]">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Severe</span>
                  <span className="text-base font-bold text-red-400 mt-0.5 block">{stats.criticalCount}</span>
                </div>
                <div className="glass-card rounded-xl border border-white/[0.05] p-3 text-center bg-zinc-905/30 min-w-[90px]">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Total Issues</span>
                  <span className="text-base font-bold text-zinc-300 mt-0.5 block">{stats.totalFindings}</span>
                </div>
                <div className="glass-card rounded-xl border border-white/[0.05] p-3 text-center bg-zinc-905/30 min-w-[90px]">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Fixes Ready</span>
                  <span className="text-base font-bold text-emerald-400 mt-0.5 block">{stats.fixCount}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => runAnalyze({ skipCache: true })}
                className="w-full sm:w-auto shrink-0 rounded-xl bg-zinc-900/60 border border-white/[0.08] px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:border-emerald-500/20 hover:text-white transition active:scale-[0.98]"
              >
                Re-run Scan
              </button>
            </div>
          </div>

          {data.log_explanation && (
            <section>
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">
                Log explanation
              </h3>
              <div className="mt-3 rounded-xl border border-white/[0.06] bg-zinc-900/40 p-4">
                <p className="text-xs font-semibold text-emerald-300/90">
                  Root cause (
                  {Math.round((data.log_explanation.confidence || 0) * 100)}%
                  confidence)
                </p>
                <p className="mt-2 text-sm text-zinc-100 whitespace-pre-wrap">
                  {safePlainText(data.log_explanation.root_cause)}
                </p>
                <p className="mt-3 text-xs text-zinc-400 whitespace-pre-wrap">
                  {safePlainText(data.log_explanation.explanation)}
                </p>
                <p className="mt-3 text-xs text-zinc-200 whitespace-pre-wrap rounded-lg bg-black/30 p-3 font-mono">
                  {safePlainText(data.log_explanation.fix)}
                </p>
              </div>
            </section>
          )}

          <section>
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">
              Critical issues
            </h3>
            <div className="mt-3">
              <CriticalIssues analyzers={data.analyzers} />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">
              Insights
            </h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {(data.insights || []).map((it, i) => (
                <InsightCard key={`${it.title}-${i}`} item={it} index={i} />
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">
              Fix suggestions
            </h3>
            <div className="mt-3">
              <FixList fixes={data.fix_suggestions} />
            </div>
          </section>

          <div className="grid gap-8 lg:grid-cols-2">
            <section>
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">
                Dependencies
              </h3>
              <div className="mt-3">
                <DependencySection analyzers={data.analyzers} />
              </div>
            </section>
            <section>
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">
                Workflows
              </h3>
              <div className="mt-3">
                <WorkflowSection analyzers={data.analyzers} />
              </div>
            </section>
          </div>

          <section>
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">
              Setup guide
            </h3>
            <div className="mt-3">
              <SetupGuide steps={data.setup_guide} />
            </div>
          </section>
        </motion.div>
      )}
    </DashboardLayout>
  );
}
