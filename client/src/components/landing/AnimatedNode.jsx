import { forwardRef } from "react";
import { motion } from "framer-motion";

const accents = {
  violet: {
    ring: "ring-violet-500/40",
    glow: "shadow-glow shadow-violet-500/30",
    pulse: "bg-violet-500/50",
    border: "border-violet-500/30",
  },
  blue: {
    ring: "ring-blue-500/40",
    glow: "shadow-glow shadow-blue-500/25",
    pulse: "bg-blue-500/50",
    border: "border-blue-500/30",
  },
  amber: {
    ring: "ring-amber-500/40",
    glow: "shadow-glow shadow-amber-500/20",
    pulse: "bg-amber-500/50",
    border: "border-amber-500/30",
  },
  emerald: {
    ring: "ring-emerald-500/40",
    glow: "shadow-glow shadow-emerald-500/30",
    pulse: "bg-emerald-500/50",
    border: "border-emerald-500/30",
  },
  cyan: {
    ring: "ring-cyan-500/40",
    glow: "shadow-glow shadow-cyan-500/25",
    pulse: "bg-cyan-500/50",
    border: "border-cyan-500/30",
  },
};

export const AnimatedNode = forwardRef(function AnimatedNode(
  { icon: Icon, label, sub, accent = "violet", active = false, burst = false },
  ref,
) {
  const a = accents[accent] || accents.violet;
  return (
    <motion.div
      ref={ref}
      className={`relative flex min-w-[140px] flex-col items-center gap-2 rounded-2xl border ${a.border} bg-zinc-900/40 px-4 py-4 backdrop-blur-xl ${a.ring} ring-1 ${a.glow} transition-shadow sm:min-w-[160px]`}
      animate={
        burst
          ? { scale: [1, 1.12, 1] }
          : active
            ? { scale: 1.02 }
            : { scale: 1 }
      }
      transition={
        burst
          ? { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
          : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
      }
    >
      <span className={`absolute inset-0 -z-10 rounded-2xl ${a.pulse} opacity-20 blur-xl`} />
      {Icon && (
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-950/80 ring-1 ring-white/10">
          <Icon className="h-6 w-6 text-zinc-100" aria-hidden />
        </div>
      )}
      <div className="text-center">
        <p className="text-sm font-semibold text-zinc-100">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
      </div>
      <motion.span
        className={`absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full ${a.pulse.replace("/50", "")}`}
        animate={{ opacity: active ? [0.4, 1, 0.4] : 0.25, scale: active ? [1, 1.2, 1] : 1 }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
});
