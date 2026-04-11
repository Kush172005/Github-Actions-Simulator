import { forwardRef } from "react";
import { motion } from "framer-motion";

const styles = {
  violet: "border-violet-500/35 shadow-glow shadow-violet-500/25 ring-violet-500/30",
  blue: "border-sky-500/35 shadow-glow shadow-sky-500/20 ring-sky-500/30",
  amber: "border-amber-500/35 shadow-glow shadow-amber-500/15 ring-amber-500/30",
  emerald: "border-emerald-500/40 shadow-glow shadow-emerald-500/30 ring-emerald-500/35",
};

export const PipelineNode = forwardRef(function PipelineNode(
  {
    icon: Icon,
    title,
    subtitle,
    badge,
    tone = "violet",
    active = false,
    pulse = false,
    label,
    children,
  },
  ref,
) {
  const ring = styles[tone] || styles.violet;
  return (
    <motion.div
      ref={ref}
      className={`relative z-20 flex min-h-[108px] min-w-[128px] flex-col gap-1.5 rounded-xl border bg-zinc-900/55 px-3 py-2.5 backdrop-blur-md ring-1 sm:min-w-[140px] ${ring}`}
      animate={
        pulse
          ? { scale: [1, 1.06, 1] }
          : active
            ? { scale: 1.02 }
            : { scale: 1 }
      }
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {pulse && (
        <motion.span
          className="pointer-events-none absolute inset-0 -z-10 rounded-xl bg-emerald-500/20"
          initial={{ opacity: 0.5, scale: 0.9 }}
          animate={{ opacity: 0, scale: 1.4 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        />
      )}
      <div className="flex items-start justify-between gap-2">
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-950/90 ring-1 ring-white/10">
            <Icon className="h-4 w-4 text-zinc-100" />
          </div>
        )}
        {badge && (
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[9px] text-zinc-500">{badge}</span>
        )}
      </div>
      <div>
        <p className="text-[11px] font-semibold leading-tight text-zinc-100 sm:text-xs">{title}</p>
        {subtitle && <p className="mt-0.5 text-[10px] text-zinc-500">{subtitle}</p>}
      </div>
      {label && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: active ? 1 : 0.4, y: 0 }}
          className={`font-mono text-[10px] ${active ? "text-emerald-400" : "text-zinc-600"}`}
        >
          {label}
        </motion.p>
      )}
      {children}
    </motion.div>
  );
});
