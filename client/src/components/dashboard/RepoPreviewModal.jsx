import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export function RepoPreviewModal({ repo, onClose }) {
  if (!repo) return null;

  // 1. Calculate an interesting, realistic "Predicted Health Profile" based on repository metadata
  const hasDesc = !!repo.description;
  const isPrivate = !!repo.private;
  const stars = repo.stargazers_count || 0;
  const forks = repo.forks_count || 0;
  const language = repo.language || "Unknown";

  // Calculate days since last push
  let daysSincePush = 0;
  if (repo.pushed_at) {
    const pushDate = new Date(repo.pushed_at);
    const diffTime = Math.abs(new Date() - pushDate);
    daysSincePush = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Health Score calculations (0-100)
  let healthScore = 75; // Baseline
  if (hasDesc) healthScore += 10;
  else healthScore -= 15;

  if (stars > 5) healthScore += 5;
  if (stars > 50) healthScore += 5;

  if (daysSincePush > 180) healthScore -= 20; // Stale project
  else if (daysSincePush < 7) healthScore += 5; // Active project

  healthScore = Math.max(10, Math.min(100, healthScore));

  // Determine security risk prediction
  let predictedRisk = "LOW";
  let riskColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  if (healthScore < 55) {
    predictedRisk = "HIGH";
    riskColor = "text-red-400 bg-red-500/10 border-red-500/20";
  } else if (healthScore < 80) {
    predictedRisk = "MEDIUM";
    riskColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
  }

  // Format Dates
  const formattedPush = repo.pushed_at
    ? new Date(repo.pushed_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "Never";

  const analyzeTo = `/dashboard/analyze?repo=${encodeURIComponent(repo.full_name || repo.name || "")}`;
  const runsTo = `/dashboard/runs?repo=${encodeURIComponent(repo.full_name || repo.name || "")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Black Translucent Backdrop Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
      />

      {/* Modal Dialog Content Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c0e] shadow-2xl p-6 sm:p-7"
      >
        {/* Glow ambient background inside modal */}
        <div
          className="absolute -top-24 right-0 h-48 w-48 rounded-full opacity-20 pointer-events-none"
          style={{
            background: "radial-gradient(circle at center, rgba(52,211,153,0.35), transparent 70%)",
            filter: "blur(24px)",
          }}
        />

        {/* Close Button Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-mono">
            Repository Profile
          </span>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/[0.04] hover:text-white transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Repository Identity Section */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-white font-mono truncate">
              {repo.name}
            </h2>
            {isPrivate ? (
              <span className="rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-400">
                Private
              </span>
            ) : (
              <span className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-400">
                Public
              </span>
            )}
          </div>
          <p className="mt-1.5 text-xs text-zinc-400 font-mono">
            {repo.full_name}
          </p>
          {repo.description ? (
            <p className="mt-3.5 text-sm leading-relaxed text-zinc-300">
              {repo.description}
            </p>
          ) : (
            <p className="mt-3.5 text-xs text-zinc-600 italic">
              No description provided for this repository.
            </p>
          )}
        </div>

        {/* Health forecast overview */}
        <div className="mt-6 rounded-xl border border-white/[0.06] bg-zinc-900/30 p-4 relative">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Pre-Audit Health Forecast
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white font-mono">{healthScore}</span>
                <span className="text-[10px] text-zinc-500 font-mono">/ 100</span>
              </div>
            </div>
            <div className={`rounded-lg border px-2.5 py-1 text-center min-w-[70px] ${riskColor}`}>
              <p className="text-[8px] font-bold uppercase tracking-wide block opacity-60">Est. Risk</p>
              <p className="text-xs font-black block mt-0.5 tracking-wider">{predictedRisk}</p>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="h-1 bg-zinc-800 rounded-full mt-4 overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${
                healthScore >= 80 ? "from-emerald-400 to-cyan-400" :
                healthScore >= 55 ? "from-amber-400 to-orange-400" : "from-red-400 to-rose-500"
              }`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
        </div>

        {/* Repository Stats Grid */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/[0.04] bg-black/20 p-3">
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Ecosystem</span>
            <span className="text-xs font-semibold text-zinc-300 mt-1 block">{language}</span>
          </div>
          <div className="rounded-xl border border-white/[0.04] bg-black/20 p-3">
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Default Branch</span>
            <span className="text-xs font-mono text-zinc-300 mt-1 block">{repo.default_branch || "main"}</span>
          </div>
          <div className="rounded-xl border border-white/[0.04] bg-black/20 p-3">
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Engagement</span>
            <span className="text-xs font-semibold text-zinc-300 mt-1 block flex items-center gap-3">
              <span>⭐ {stars}</span>
              <span>🍴 {forks}</span>
            </span>
          </div>
          <div className="rounded-xl border border-white/[0.04] bg-black/20 p-3">
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Last Active</span>
            <span className="text-xs font-semibold text-zinc-300 mt-1 block">{formattedPush}</span>
          </div>
        </div>

        {/* Action Button Row */}
        <div className="mt-6 pt-5 border-t border-white/[0.05] flex flex-col gap-2.5">
          <Link
            to={analyzeTo}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-950 shadow-lg shadow-emerald-500/15 transition hover:opacity-95 text-center no-underline border border-transparent active:scale-[0.98]"
          >
            Launch Deep AI Audit
          </Link>
          <div className="flex gap-2.5">
            <Link
              to={runsTo}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-zinc-900/40 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:border-emerald-500/25 hover:text-white text-center no-underline active:scale-[0.98]"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Actions Runs
            </Link>
            <a
              href={repo.html_url}
              target="_blank"
              rel="noreferrer"
              className="flex-1 inline-flex items-center justify-center rounded-xl border border-white/[0.08] bg-zinc-900/40 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:border-white/20 hover:text-white text-center no-underline active:scale-[0.98]"
            >
              Open on GitHub
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
