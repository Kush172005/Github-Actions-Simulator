import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function conclusionDot(conclusion) {
  switch (conclusion) {
    case "success":
      return "bg-emerald-400";
    case "failure":
    case "timed_out":
      return "bg-red-400";
    case "cancelled":
      return "bg-zinc-500";
    case "skipped":
      return "bg-zinc-700";
    default:
      return "bg-sky-400 animate-pulse";
  }
}

function conclusionText(conclusion, status) {
  if (!conclusion && status === "in_progress") return "running";
  switch (conclusion) {
    case "success": return "success";
    case "failure": return "failed";
    case "cancelled": return "cancelled";
    case "timed_out": return "timed out";
    case "skipped": return "skipped";
    default: return conclusion || status || "—";
  }
}

function JobCard({ job }) {
  const [expanded, setExpanded] = useState(job.conclusion !== "success");
  const isFailed = job.conclusion === "failure" || job.conclusion === "timed_out" || job.conclusion === "cancelled";

  return (
    <div
      className={`rounded-xl border transition-colors ${
        isFailed
          ? "border-red-500/20 bg-red-500/5"
          : job.conclusion === "success"
          ? "border-emerald-500/10 bg-zinc-900/30"
          : "border-white/[0.06] bg-zinc-900/30"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${conclusionDot(job.conclusion)}`} />
        <span className="flex-1 text-sm font-semibold text-zinc-100">{job.name}</span>
        {job.duration_seconds != null && (
          <span className="shrink-0 font-mono text-[11px] text-zinc-600">
            {job.duration_seconds < 60
              ? `${job.duration_seconds}s`
              : `${Math.floor(job.duration_seconds / 60)}m ${job.duration_seconds % 60}s`}
          </span>
        )}
        <span
          className={`shrink-0 rounded-md border px-1.5 py-px text-[10px] font-bold uppercase tracking-wider ${
            isFailed
              ? "border-red-500/20 bg-red-500/10 text-red-400"
              : job.conclusion === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
              : "border-zinc-600/20 bg-zinc-800/30 text-zinc-400"
          }`}
        >
          {conclusionText(job.conclusion, job.status)}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-zinc-600 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (job.steps || []).length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-white/[0.04]"
          >
            <div className="px-4 py-2 space-y-0.5">
              {(job.steps || []).map((step) => {
                const stepFailed = step.conclusion === "failure" || step.conclusion === "timed_out";
                return (
                  <div
                    key={step.number}
                    className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${
                      stepFailed ? "bg-red-500/5" : ""
                    }`}
                  >
                    <span className="w-5 shrink-0 text-right font-mono text-[10px] text-zinc-700">
                      {step.number}
                    </span>
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${conclusionDot(step.conclusion)}`} />
                    <span
                      className={`flex-1 text-xs ${
                        stepFailed ? "font-semibold text-red-300" : "text-zinc-400"
                      }`}
                    >
                      {step.name}
                    </span>
                    {step.conclusion && (
                      <span
                        className={`shrink-0 text-[10px] font-medium ${
                          stepFailed ? "text-red-400" : step.conclusion === "success" ? "text-emerald-400/70" : "text-zinc-600"
                        }`}
                      >
                        {conclusionText(step.conclusion, step.status)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function JobStepsPanel({ jobs }) {
  if (!jobs || jobs.length === 0) {
    return <p className="text-xs text-zinc-500">No job details available.</p>;
  }
  return (
    <div className="space-y-2">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}
