import { forwardRef } from "react";
import { motion } from "framer-motion";

/** Glowing data packet — GSAP controls position via transform. */
export const DataPacket = forwardRef(function DataPacket({ color = "#34d399" }, ref) {
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-30 will-change-transform"
      style={{ width: 16, height: 16 }}
    >
      {/* Outer glow ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: color,
          boxShadow: `0 0 0 4px ${color}40, 0 0 20px ${color}80, 0 0 40px ${color}40`,
          animation: "packet-pulse 1.5s ease-out infinite",
        }}
      />
      {/* Inner bright core */}
      <div
        className="absolute inset-[3px] rounded-full"
        style={{ background: "#fff", opacity: 0.9 }}
      />
    </div>
  );
});

/** Stacked queue jobs — GSAP controls individual positions. */
export function QueueStack({ stackRefs }) {
  const colors = ["#818cf8", "#60a5fa", "#34d399", "#fbbf24", "#f87171"];
  return (
    <div className="pointer-events-none absolute inset-0 z-20" aria-hidden>
      {stackRefs.map((r, i) => (
        <div
          key={i}
          ref={r}
          className="absolute left-0 top-0 will-change-transform rounded-sm"
          style={{
            width: 28 - i * 2,
            height: 8,
            background: colors[i % colors.length],
            boxShadow: `0 0 8px ${colors[i % colors.length]}80`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}

/** SVG connector lines between pipeline nodes */
export function FlowLine({ x1, y1, x2, y2, active, color = "#34d399" }) {
  const length = Math.hypot(x2 - x1, y2 - y1);

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0"
      style={{ width: "100%", height: "100%", overflow: "visible" }}
      aria-hidden
    >
      {/* Base line */}
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="1"
      />
      {/* Active animated line */}
      {active && (
        <motion.line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray="6 4"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.7 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            filter: `drop-shadow(0 0 4px ${color})`,
          }}
        />
      )}
    </svg>
  );
}

/** Queue visualization panel */
export function QueuePanel({ active, jobCount = 5 }) {
  const jobs = Array.from({ length: jobCount }, (_, i) => ({
    id: `#${142 + i}`,
    branch: ["main", "feat/auth", "fix/redis", "chore/ci", "feat/logs"][i % 5],
    priority: i === 0 ? "high" : "normal",
    wait: i === 0 ? "0ms" : `${(i * 120 + 80)}ms`,
    status: i === 0 ? "running" : "queued",
  }));

  return (
    <motion.div
      className="glass-card rounded-xl overflow-hidden"
      animate={active ? { opacity: 1, y: 0 } : { opacity: 0.4, y: 4 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.3)" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400" style={{ animation: active ? "packet-pulse 1.5s infinite" : "none", boxShadow: "0 0 8px rgba(251,191,36,0.6)" }} />
          <span className="text-xs font-semibold text-zinc-300">Redis Queue</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono">
          <span>{jobCount} jobs</span>
          <span className="text-amber-400">avg 340ms</span>
        </div>
      </div>

      {/* Job rows */}
      <div className="divide-y" style={{ divideColor: "rgba(255,255,255,0.03)" }}>
        {jobs.map((job, i) => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, x: -8 }}
            animate={active ? { opacity: 1, x: 0 } : { opacity: 0 }}
            transition={{ delay: i * 0.07, duration: 0.3 }}
            className="flex items-center gap-3 px-4 py-2"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
          >
            {/* Status indicator */}
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: job.status === "running" ? "#34d399" : "rgba(255,255,255,0.15)",
                boxShadow: job.status === "running" ? "0 0 6px rgba(52,211,153,0.6)" : "none",
                animation: job.status === "running" ? "packet-pulse 1.5s infinite" : "none",
              }}
            />
            {/* Job ID */}
            <span className="font-mono text-[11px] text-zinc-400 w-12 flex-shrink-0">{job.id}</span>
            {/* Branch */}
            <span className="font-mono text-[11px] text-blue-400 flex-1 truncate">{job.branch}</span>
            {/* Priority */}
            <span
              className="font-mono text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
              style={{
                background: job.priority === "high" ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.05)",
                color: job.priority === "high" ? "#f87171" : "#71717a",
                border: `1px solid ${job.priority === "high" ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)"}`,
              }}
            >
              {job.priority}
            </span>
            {/* Wait time */}
            <span className="font-mono text-[10px] text-zinc-600 w-10 text-right flex-shrink-0">{job.wait}</span>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="flex items-center gap-2 px-4 py-2 text-[10px] font-mono text-zinc-600"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
      >
        <span>Workers: 4 active</span>
        <span className="ml-auto text-emerald-600">throughput: 12 jobs/s</span>
      </div>
    </motion.div>
  );
}
