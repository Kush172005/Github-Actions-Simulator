import { motion } from "framer-motion";
import { safePlainText } from "../../lib/sanitize.js";

export function InsightCard({ item, index }) {
  const title = safePlainText(item.title);
  const body = safePlainText(item.explanation);
  const cat = safePlainText(item.category);
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="glass-card rounded-xl border border-white/[0.06] p-4"
      style={{ background: "rgba(24,24,27,0.55)" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/80">
        {cat || "Insight"}
      </p>
      <h3 className="mt-1 text-sm font-semibold text-zinc-100">{title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-zinc-400 whitespace-pre-wrap">{body}</p>
    </motion.article>
  );
}
