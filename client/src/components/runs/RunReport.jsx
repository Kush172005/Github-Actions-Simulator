import { useState } from "react";
import { motion } from "framer-motion";
import { safePlainText } from "../../lib/sanitize.js";
import { JobStepsPanel } from "./JobStepsPanel.jsx";

function conclusionConfig(conclusion) {
  switch (conclusion) {
    case "success":
      return { label: "Passed", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
    case "failure":
      return { label: "Failed", color: "text-red-400 bg-red-500/10 border-red-500/30" };
    case "cancelled":
      return { label: "Cancelled", color: "text-zinc-400 bg-zinc-700/20 border-zinc-600/30" };
    case "timed_out":
      return { label: "Timed Out", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
    default:
      return { label: conclusion || "Unknown", color: "text-zinc-400 bg-zinc-800/20 border-zinc-700/20" };
  }
}

function ConfidencePip({ confidence }) {
  const pct = Math.round((confidence || 0) * 100);
  const color =
    pct >= 75 ? "from-emerald-400 to-cyan-400" :
    pct >= 45 ? "from-amber-400 to-orange-400" : "from-red-400 to-rose-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full bg-gradient-to-r ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[11px] text-zinc-400">{pct}% confidence</span>
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 rounded-lg border border-white/[0.08] px-2 py-1 text-[10px] font-semibold text-zinc-400 transition hover:border-emerald-500/30 hover:text-emerald-300 active:scale-95"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function SectionHeading({ children }) {
  return (
    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">{children}</h3>
  );
}

export function RunReport({ data, onBack }) {
  const { run, jobs, diagnosis, what_worked, warnings, correlations, logs_available, ai_warning } = data;
  const cfg = conclusionConfig(run?.conclusion);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-10"
    >
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition hover:text-zinc-200"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to runs
      </button>

      {/* Hero */}
      <div className="flex flex-col gap-4 border-b border-white/[0.04] pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-lg border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${cfg.color}`}>
              {cfg.label}
            </span>
            <h2 className="font-mono text-xl font-bold text-white">
              {safePlainText(run?.name || "Workflow run")}
            </h2>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500">
            <span>
              Branch: <span className="font-mono text-zinc-300">{safePlainText(run?.head_branch || "—")}</span>
            </span>
            <span>
              Event: <span className="text-zinc-400">{safePlainText(run?.event || "—")}</span>
            </span>
            <span className="font-mono text-zinc-600">{(run?.head_sha || "").slice(0, 7)}</span>
            <span>
              Run{" "}
              <a
                href={run?.html_url}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-emerald-400/80 no-underline hover:text-emerald-300"
              >
                #{run?.run_number}
              </a>
            </span>
            {run?.workflow_path && (
              <span className="font-mono text-zinc-700">{run.workflow_path.replace(".github/workflows/", "")}</span>
            )}
          </div>
          {diagnosis && (
            <div className="mt-3">
              <ConfidencePip confidence={diagnosis.confidence} />
            </div>
          )}
        </div>
      </div>

      {/* Warnings */}
      {!logs_available && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-300">
          Job logs have expired (GitHub retains them for 90 days). Diagnosis is based on job/step structure and static analysis only.
        </div>
      )}
      {ai_warning && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-300">
          {safePlainText(ai_warning)}
        </div>
      )}

      {/* Diagnosis */}
      {diagnosis ? (
        <section>
          <SectionHeading>Root cause</SectionHeading>
          <div className="mt-3 rounded-xl border border-white/[0.06] bg-zinc-900/40 p-4 sm:p-5 space-y-4">
            {/* Affected location */}
            {(diagnosis.affected_job || diagnosis.affected_step) && (
              <div className="flex flex-wrap gap-3 text-[11px]">
                {diagnosis.affected_job && (
                  <span className="rounded-md border border-red-500/20 bg-red-500/8 px-2 py-1 font-mono text-red-300">
                    job: {safePlainText(diagnosis.affected_job)}
                  </span>
                )}
                {diagnosis.affected_step && (
                  <span className="rounded-md border border-red-500/15 bg-red-500/5 px-2 py-1 font-mono text-red-400/80">
                    step: {safePlainText(diagnosis.affected_step)}
                  </span>
                )}
              </div>
            )}

            {/* Root cause statement */}
            <p className="text-sm font-semibold text-zinc-100 leading-relaxed">
              {safePlainText(diagnosis.root_cause)}
            </p>

            {/* Explanation */}
            <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">
              {safePlainText(diagnosis.explanation)}
            </p>

            {/* Fix */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Recommended fix</p>
                <CopyButton text={diagnosis.fix} />
              </div>
              <pre className="overflow-x-auto rounded-lg bg-black/40 px-3 py-2.5 font-mono text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {safePlainText(diagnosis.fix)}
              </pre>
            </div>
          </div>
        </section>
      ) : (
        <section>
          <SectionHeading>Diagnosis</SectionHeading>
          <p className="mt-3 text-xs text-zinc-500">
            AI diagnosis unavailable. Review the job/step details below.
          </p>
        </section>
      )}

      {/* Correlations */}
      {correlations && correlations.length > 0 && (
        <section>
          <SectionHeading>Correlations</SectionHeading>
          <p className="mt-1 text-[11px] text-zinc-600">Runtime failure connected to static analysis findings.</p>
          <div className="mt-3 space-y-3">
            {correlations.map((c, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
                className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-4"
              >
                <p className="text-xs font-semibold text-cyan-300">{safePlainText(c.title)}</p>
                <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">{safePlainText(c.detail)}</p>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* What worked + Warnings */}
      {((what_worked && what_worked.length > 0) || (warnings && warnings.length > 0)) && (
        <div className="grid gap-6 sm:grid-cols-2">
          {what_worked && what_worked.length > 0 && (
            <section>
              <SectionHeading>What worked</SectionHeading>
              <ul className="mt-3 space-y-1.5">
                {what_worked.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                    <span className="mt-0.5 shrink-0 text-emerald-400">✓</span>
                    {safePlainText(item)}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {warnings && warnings.length > 0 && (
            <section>
              <SectionHeading>Warnings</SectionHeading>
              <ul className="mt-3 space-y-1.5">
                {warnings.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                    <span className="mt-0.5 shrink-0 text-amber-400">⚠</span>
                    {safePlainText(item)}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* Jobs & Steps */}
      <section>
        <SectionHeading>Jobs &amp; steps</SectionHeading>
        <div className="mt-3">
          <JobStepsPanel jobs={jobs} />
        </div>
      </section>
    </motion.div>
  );
}
