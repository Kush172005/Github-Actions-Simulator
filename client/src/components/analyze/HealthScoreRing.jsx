import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

function scoreColor(score) {
  if (score >= 75) return { stroke: "#34d399", glow: "rgba(52,211,153,0.35)" };
  if (score >= 50) return { stroke: "#fbbf24", glow: "rgba(251,191,36,0.35)" };
  return { stroke: "#f87171", glow: "rgba(248,113,113,0.35)" };
}

export function HealthScoreRing({ score }) {
  const spring = useSpring(0, { stiffness: 90, damping: 18 });
  const display = useTransform(spring, (v) => Math.round(v));

  useEffect(() => {
    spring.set(Math.max(0, Math.min(100, Number(score) || 0)));
  }, [score, spring]);

  const pct = Math.max(0, Math.min(100, Number(score) || 0));
  const c = scoreColor(pct);
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="relative flex h-40 w-40 shrink-0 items-center justify-center">
      <div
        className="pointer-events-none absolute inset-0 rounded-full blur-xl"
        style={{ background: `radial-gradient(circle at center, ${c.glow}, transparent 65%)` }}
      />
      <svg className="relative h-36 w-36 -rotate-90" viewBox="0 0 120 120" aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={c.stroke}
          strokeWidth="10"
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${dash} ${circ - dash}` }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span className="text-3xl font-bold tabular-nums text-white">
          {display}
        </motion.span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Health
        </span>
      </div>
    </div>
  );
}
