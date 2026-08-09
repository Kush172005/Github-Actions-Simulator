import { motion } from "framer-motion";
import { safePlainText } from "../../lib/sanitize.js";

const CATEGORY_THEMES = {
  security: {
    border: "border-red-500/20",
    bg: "rgba(30, 10, 10, 0.55)",
    glow: "shadow-[0_0_15px_rgba(239,68,68,0.07)]",
    text: "text-red-400",
    badge: "bg-red-500/10 text-red-400 border-red-500/20",
    label: "Security Alert"
  },
  ci_cd: {
    border: "border-blue-500/20",
    bg: "rgba(10, 20, 30, 0.55)",
    glow: "shadow-[0_0_15px_rgba(59,130,246,0.07)]",
    text: "text-blue-400",
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    label: "CI/CD Pipeline"
  },
  dependencies: {
    border: "border-amber-500/20",
    bg: "rgba(30, 20, 10, 0.55)",
    glow: "shadow-[0_0_15px_rgba(245,158,11,0.07)]",
    text: "text-amber-400",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    label: "Dependencies"
  },
  developer_experience: {
    border: "border-purple-500/20",
    bg: "rgba(25, 10, 30, 0.55)",
    glow: "shadow-[0_0_15px_rgba(139,92,246,0.07)]",
    text: "text-purple-400",
    badge: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    label: "Dev Experience"
  },
  maintenance: {
    border: "border-orange-500/20",
    bg: "rgba(30, 15, 10, 0.55)",
    glow: "shadow-[0_0_15px_rgba(249,115,22,0.07)]",
    text: "text-orange-400",
    badge: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    label: "Maintenance Debt"
  },
  public_health: {
    border: "border-emerald-500/20",
    bg: "rgba(10, 30, 20, 0.55)",
    glow: "shadow-[0_0_15px_rgba(16,185,129,0.07)]",
    text: "text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    label: "Open Source"
  }
};

export function InsightCard({ item, index }) {
  const title = safePlainText(item.title);
  const body = safePlainText(item.explanation);
  const cat = safePlainText(item.category || "general").toLowerCase();

  const theme = CATEGORY_THEMES[cat] || {
    border: "border-white/[0.06]",
    bg: "rgba(24,24,27,0.55)",
    glow: "",
    text: "text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    label: cat
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`glass-card rounded-xl border ${theme.border} ${theme.glow} p-5 flex flex-col justify-between`}
      style={{ background: theme.bg }}
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          <span className={`rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${theme.badge}`}>
            {theme.label}
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-700 animate-pulse" />
        </div>
        <h3 className="mt-3 text-sm font-semibold text-zinc-100 leading-snug">{title}</h3>
        <p className="mt-2 text-xs leading-relaxed text-zinc-400 whitespace-pre-wrap">{body}</p>
      </div>
      <div className="mt-4 pt-3 border-t border-white/[0.03] flex items-center gap-1.5 text-[10px] text-zinc-500">
        <span className={`${theme.text}`}>●</span> Ready to remediate
      </div>
    </motion.article>
  );
}

