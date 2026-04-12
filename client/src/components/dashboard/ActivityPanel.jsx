import { motion } from "framer-motion";
import { TerminalStream } from "./TerminalStream.jsx";

export function ActivityPanel({ active = true }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="glass-card flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/[0.06]"
      style={{ background: "rgba(18, 18, 22, 0.75)" }}
    >
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Live activity</h2>
          <p className="text-[11px] text-zinc-500">
            Simulated runner — your engine is warm
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/50 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-emerald-400/90">
            streaming
          </span>
        </div>
      </div>
      <div className="min-h-0 flex-1 p-4">
        <TerminalStream active={active} />
      </div>
    </motion.section>
  );
}
