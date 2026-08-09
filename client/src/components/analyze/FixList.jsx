import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { safePlainText } from "../../lib/sanitize.js";

function FixItem({ f, index }) {
  const [isOpen, setIsOpen] = useState(false);
  const problem = safePlainText(f.problem);
  const impact = safePlainText(f.impact);
  const exactFix = safePlainText(f.exact_fix);
  const reasoning = safePlainText(f.reasoning);
  const priority = f.priority || 50;

  // Determine priority color theme
  let priorityColor = "bg-emerald-400";
  let priorityText = "text-emerald-400";
  let priorityBg = "bg-emerald-500/10";
  let priorityBorder = "border-emerald-500/20";
  
  if (priority >= 80) {
    priorityColor = "bg-red-400";
    priorityText = "text-red-400";
    priorityBg = "bg-red-500/10";
    priorityBorder = "border-red-500/20";
  } else if (priority >= 50) {
    priorityColor = "bg-amber-400";
    priorityText = "text-amber-400";
    priorityBg = "bg-amber-500/10";
    priorityBorder = "border-amber-500/20";
  } else {
    priorityColor = "bg-blue-400";
    priorityText = "text-blue-400";
    priorityBg = "bg-blue-500/10";
    priorityBorder = "border-blue-500/20";
  }

  const [copied, setCopied] = useState(false);
  const copyToClipboard = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(exactFix);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`glass-card rounded-xl border border-white/[0.06] overflow-hidden transition-all duration-300 ${
        isOpen ? "ring-1 ring-emerald-500/20" : ""
      }`}
      style={{ background: "rgba(24, 24, 27, 0.5)" }}
    >
      {/* Clickable Header Accordion Toggle */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-4 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors select-none"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-100 truncate pr-4">
            {problem}
          </p>
          <div className="mt-2 flex items-center gap-3">
            {/* Visual Priority bar */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-500 font-mono">Priority:</span>
              <div className="h-1.5 w-16 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${priorityColor}`}
                  style={{ width: `${priority}%` }}
                />
              </div>
              <span className={`text-[10px] font-bold font-mono ${priorityText}`}>
                {priority}
              </span>
            </div>
            <span className="text-zinc-700 font-mono text-[10px]">•</span>
            <span className="text-[10px] text-zinc-500 font-mono truncate">
              {isOpen ? "Click to collapse" : "Click to view fix details"}
            </span>
          </div>
        </div>

        {/* Accordion Arrow Icon */}
        <div className="shrink-0 flex items-center gap-2">
          <span className={`rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${priorityBg} ${priorityText} ${priorityBorder}`}>
            P{priority}
          </span>
          <svg
            className={`h-4 w-4 text-zinc-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expandable Details Container */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="border-t border-white/[0.04] bg-black/10 overflow-hidden"
          >
            <div className="p-4 space-y-3.5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Impact Analysis</p>
                <p className="mt-1 text-xs text-zinc-300 leading-relaxed">{impact}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Exact Remediation Script / Code</p>
                  <button
                    onClick={copyToClipboard}
                    className="text-[9px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 active:scale-95 transition"
                  >
                    {copied ? "Copied! ✓" : "Copy Code"}
                  </button>
                </div>
                <div className="relative">
                  <pre className="text-xs text-zinc-200 whitespace-pre-wrap rounded-lg bg-black/40 p-3.5 font-mono leading-relaxed border border-white/[0.04] overflow-x-auto select-all">
                    {exactFix}
                  </pre>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Underlying Reasoning</p>
                <p className="mt-1 text-xs text-zinc-400 leading-relaxed italic">{reasoning}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

export function FixList({ fixes }) {
  const sorted = [...(fixes || [])].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  if (!sorted.length) {
    return (
      <div className="rounded-xl border border-dashed border-white/[0.08] p-6 text-center bg-zinc-900/10">
        <p className="text-xs text-zinc-500">No prioritized fix suggestions found in this context.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {sorted.map((f, i) => (
        <FixItem key={`${f.problem}-${i}`} f={f} index={i} />
      ))}
    </ul>
  );
}
