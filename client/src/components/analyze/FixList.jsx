import { motion } from "framer-motion";
import { safePlainText } from "../../lib/sanitize.js";

export function FixList({ fixes }) {
  const sorted = [...(fixes || [])].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  if (!sorted.length) {
    return (
      <p className="text-xs text-zinc-500">No prioritized fix suggestions returned.</p>
    );
  }
  return (
    <ol className="space-y-3">
      {sorted.map((f, i) => (
        <motion.li
          key={`${f.problem}-${i}`}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.03 }}
          className="glass-card rounded-xl border border-white/[0.06] p-4"
          style={{ background: "rgba(24,24,27,0.5)" }}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-zinc-100">
              {safePlainText(f.problem)}
            </p>
            <span className="shrink-0 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
              P{f.priority}
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            <span className="font-semibold text-zinc-300">Impact: </span>
            {safePlainText(f.impact)}
          </p>
          <p className="mt-2 text-xs text-zinc-300 whitespace-pre-wrap rounded-lg bg-black/30 p-3 font-mono leading-relaxed">
            {safePlainText(f.exact_fix)}
          </p>
          <p className="mt-2 text-[11px] text-zinc-500">
            <span className="text-zinc-400">Reasoning: </span>
            {safePlainText(f.reasoning)}
          </p>
        </motion.li>
      ))}
    </ol>
  );
}
