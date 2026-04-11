import { forwardRef } from "react";
import { motion } from "framer-motion";

const ACCENT_MAP = {
  violet: {
    border: "rgba(139,92,246,0.35)",
    bg: "rgba(139,92,246,0.08)",
    glow: "rgba(139,92,246,0.4)",
    ring: "rgba(139,92,246,0.5)",
    dot: "#a78bfa",
    label: "#c4b5fd",
  },
  blue: {
    border: "rgba(59,130,246,0.35)",
    bg: "rgba(59,130,246,0.08)",
    glow: "rgba(59,130,246,0.4)",
    ring: "rgba(59,130,246,0.5)",
    dot: "#60a5fa",
    label: "#93c5fd",
  },
  amber: {
    border: "rgba(245,158,11,0.35)",
    bg: "rgba(245,158,11,0.06)",
    glow: "rgba(245,158,11,0.35)",
    ring: "rgba(245,158,11,0.5)",
    dot: "#fbbf24",
    label: "#fcd34d",
  },
  emerald: {
    border: "rgba(52,211,153,0.35)",
    bg: "rgba(52,211,153,0.07)",
    glow: "rgba(52,211,153,0.4)",
    ring: "rgba(52,211,153,0.5)",
    dot: "#34d399",
    label: "#6ee7b7",
  },
  cyan: {
    border: "rgba(34,211,238,0.35)",
    bg: "rgba(34,211,238,0.07)",
    glow: "rgba(34,211,238,0.35)",
    ring: "rgba(34,211,238,0.5)",
    dot: "#22d3ee",
    label: "#67e8f9",
  },
};

export const PipelineNode = forwardRef(function PipelineNode(
  {
    icon: Icon,
    label,
    sub,
    accent = "violet",
    active = false,
    burst = false,
    statusText,
    step,
  },
  ref
) {
  const a = ACCENT_MAP[accent] || ACCENT_MAP.violet;

  return (
    <div
      ref={ref}
      className="relative flex flex-col items-center gap-3"
      style={{ minWidth: 120 }}
    >
      {/* Step label */}
      {step && (
        <div
          className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono tracking-widest"
          style={{ color: "rgba(255,255,255,0.2)" }}
        >
          {step}
        </div>
      )}

      {/* Node card */}
      <motion.div
        className="relative pipeline-node flex flex-col items-center gap-2.5 px-5 py-4"
        style={{
          border: `1px solid ${active ? a.ring : a.border}`,
          background: active ? a.bg : "rgba(14, 14, 18, 0.7)",
          boxShadow: active
            ? `0 0 0 1px ${a.ring}, 0 0 24px ${a.glow}, 0 4px 32px rgba(0,0,0,0.6)`
            : `0 4px 24px rgba(0,0,0,0.4)`,
          transition: "box-shadow 0.4s ease, border-color 0.3s ease, background 0.3s ease",
        }}
        animate={
          burst
            ? { scale: [1, 1.15, 0.97, 1.04, 1] }
            : active
            ? { scale: 1.03 }
            : { scale: 1 }
        }
        transition={
          burst
            ? { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
            : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
        }
      >
        {/* Burst ring effect */}
        {burst && (
          <>
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                border: `2px solid ${a.dot}`,
                animation: "burst-ring 0.7s ease-out forwards",
              }}
            />
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                border: `1px solid ${a.dot}`,
                animation: "burst-ring 0.7s ease-out 0.1s forwards",
              }}
            />
          </>
        )}

        {/* Active pulse overlay */}
        {active && !burst && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{ background: a.bg }}
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Icon wrapper */}
        <div
          className="relative w-11 h-11 rounded-xl flex items-center justify-center"
          style={{
            background: "rgba(0,0,0,0.4)",
            border: `1px solid rgba(255,255,255,0.06)`,
          }}
        >
          {Icon && <Icon className="w-6 h-6 text-zinc-200" />}
          {/* Active dot indicator top-right */}
          {active && (
            <motion.div
              className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
              style={{ background: a.dot }}
              animate={{ scale: [1, 1.4, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold text-zinc-100 whitespace-nowrap">{label}</p>
          <p className="text-[11px] mt-0.5 whitespace-nowrap" style={{ color: "rgba(255,255,255,0.3)" }}>{sub}</p>
        </div>

        {/* Status text */}
        {statusText && active && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-[10px] px-2 py-0.5 rounded"
            style={{
              background: `${a.bg}`,
              border: `1px solid ${a.border}`,
              color: a.label,
            }}
          >
            {statusText}
          </motion.div>
        )}

        {/* Bottom pulse dot */}
        <motion.div
          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
          style={{
            background: active ? a.dot : "rgba(255,255,255,0.1)",
            boxShadow: active ? `0 0 8px ${a.glow}` : "none",
          }}
          animate={
            active
              ? { scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }
              : { scale: 1, opacity: 0.3 }
          }
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Label below */}
      <div
        className="text-[10px] font-mono tracking-wide uppercase"
        style={{ color: active ? a.label : "rgba(255,255,255,0.2)" }}
      >
        {active ? "● active" : "○ idle"}
      </div>
    </div>
  );
});
