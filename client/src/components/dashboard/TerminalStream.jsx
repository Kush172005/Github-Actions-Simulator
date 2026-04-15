import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SCRIPT = [
  { level: "pending", text: "→  Resolving runner image ubuntu-22.04…" },
  { level: "pending", text: "→  Checking out repository…" },
  { level: "running", text: "●  Cloning repo…" },
  {
    level: "running",
    text: "   remote: Compressing objects: 100% (1824/1824)",
  },
  { level: "running", text: "●  Installing dependencies…" },
  { level: "running", text: "   npm ci — 4.2s" },
  { level: "running", text: "●  Running build…" },
  { level: "running", text: "   vite build — bundle 842 kB" },
  { level: "running", text: "●  Running tests…" },
  { level: "running", text: "   pytest — 42 passed in 3.1s" },
  { level: "success", text: "✓  Build successful — artifact ready" },
];

const levelColor = {
  pending: "text-amber-400/90",
  running: "text-sky-400/95",
  success: "text-emerald-400",
  failed: "text-red-400",
};

export function TerminalStream({ active = true }) {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (!active) {
      setVisible(0);
      return;
    }
    // Stay on the final frame — do not loop the script (better UX).
    if (visible >= SCRIPT.length) return;

    const delay = visible < 3 ? 400 : visible < 8 ? 600 : 200;
    const t = window.setTimeout(() => setVisible((v) => v + 1), delay);
    return () => window.clearTimeout(t);
  }, [active, visible]);

  const lastLevel =
    SCRIPT[Math.min(visible, SCRIPT.length - 1)]?.level || "running";

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-white/[0.06] font-mono text-xs leading-relaxed sm:text-[13px] sm:leading-7"
      style={{
        background: "linear-gradient(180deg, #0a0a0c 0%, #060608 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div className="flex items-center gap-2 border-b border-white/[0.05] px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-red-500/80" />
        <span className="h-2 w-2 rounded-full bg-amber-500/80" />
        <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
        <span className="ml-2 text-[11px] text-zinc-600 sm:text-xs">
          pipeline — live
        </span>
        <span
          className={`ml-auto text-[11px] font-medium uppercase tracking-wide sm:text-xs ${
            lastLevel === "success"
              ? "text-emerald-400/90"
              : lastLevel === "failed"
              ? "text-red-400/90"
              : "text-sky-400/80"
          }`}
        >
          {lastLevel === "success"
            ? "success"
            : lastLevel === "failed"
            ? "failed"
            : lastLevel === "pending"
            ? "queued"
            : "running"}
        </span>
      </div>
      <div className="min-h-[200px] overflow-hidden px-3 py-3 sm:px-4">
        <AnimatePresence initial={false}>
          {SCRIPT.slice(0, visible).map((line, i) => (
            <motion.div
              key={`${i}-${line.text}`}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              className={`min-h-[1.5rem] ${
                levelColor[line.level] || "text-zinc-400"
              }`}
            >
              {line.text}
            </motion.div>
          ))}
        </AnimatePresence>
        {active && visible > 0 && visible < SCRIPT.length && (
          <span className="ml-0.5 inline-block h-4 w-2 translate-y-1 bg-emerald-400/90 animate-pulse" />
        )}
      </div>
    </div>
  );
}
