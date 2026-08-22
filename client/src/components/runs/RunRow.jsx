import { motion } from "framer-motion";

function conclusionConfig(conclusion, status) {
  if (status === "in_progress" || status === "queued" || status === "waiting") {
    return { label: status === "queued" ? "Queued" : "Running", color: "text-sky-400 bg-sky-500/10 border-sky-500/20" };
  }
  switch (conclusion) {
    case "success":
      return { label: "Success", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
    case "failure":
      return { label: "Failed", color: "text-red-400 bg-red-500/10 border-red-500/20" };
    case "cancelled":
      return { label: "Cancelled", color: "text-zinc-400 bg-zinc-700/30 border-zinc-600/30" };
    case "timed_out":
      return { label: "Timed out", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    case "skipped":
      return { label: "Skipped", color: "text-zinc-500 bg-zinc-800/30 border-zinc-700/20" };
    default:
      return { label: conclusion || "Unknown", color: "text-zinc-400 bg-zinc-800/20 border-zinc-700/20" };
  }
}

function relativeTime(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function durationStr(seconds) {
  if (!seconds && seconds !== 0) return null;
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function eventLabel(event) {
  const map = {
    push: "push",
    pull_request: "PR",
    workflow_dispatch: "manual",
    schedule: "schedule",
    release: "release",
    workflow_call: "called",
  };
  return map[event] || event || "—";
}

export function RunRow({ run, index, onSelect }) {
  const cfg = conclusionConfig(run.conclusion, run.status);
  const isCompleted = run.status === "completed";
  const dur = durationStr(run.duration_seconds);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative flex items-center gap-4 rounded-xl border border-white/[0.06] px-4 py-3.5 transition-all duration-200 ${
        isCompleted
          ? "cursor-pointer hover:border-emerald-500/25 hover:bg-zinc-900/60"
          : "opacity-60 cursor-default"
      }`}
      style={{ background: "rgba(24,24,27,0.45)" }}
      onClick={() => isCompleted && onSelect && onSelect(run)}
    >
      {/* Hover glow */}
      {isCompleted && (
        <div
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ boxShadow: "inset 0 0 0 1px rgba(52,211,153,0.12)" }}
        />
      )}

      {/* Conclusion pill */}
      <span
        className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}
      >
        {cfg.label}
      </span>

      {/* Workflow info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-100 group-hover:text-white">
          {run.name || "Workflow run"}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <span className="font-mono text-zinc-400">{run.head_branch || "—"}</span>
          </span>
          <span className="rounded bg-zinc-800/60 px-1.5 py-px font-mono text-[10px] text-zinc-500">
            {eventLabel(run.event)}
          </span>
          {run.workflow_path && (
            <span className="hidden font-mono text-[10px] text-zinc-600 sm:inline">
              {run.workflow_path.replace(".github/workflows/", "")}
            </span>
          )}
        </div>
      </div>

      {/* Right side metadata */}
      <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
        <span className="text-[11px] text-zinc-500">{relativeTime(run.updated_at)}</span>
        {dur && <span className="font-mono text-[10px] text-zinc-600">{dur}</span>}
        <span className="font-mono text-[10px] text-zinc-700">#{run.run_number}</span>
      </div>

      {/* Analyze chevron */}
      {isCompleted && (
        <div className="shrink-0 text-zinc-600 transition-colors group-hover:text-emerald-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </motion.div>
  );
}
