import { motion } from "framer-motion";

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function RepoCard({ repo, index }) {
  const href = repo.html_url || "#";
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noreferrer"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.04,
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ scale: 1.03, y: -2 }}
      className="group glass-card relative block overflow-hidden rounded-xl border border-white/[0.06] p-4 no-underline transition-shadow"
      style={{
        background: "rgba(24, 24, 27, 0.55)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.03)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          boxShadow: "inset 0 0 0 1px rgba(52,211,153,0.25)",
          background:
            "radial-gradient(120% 80% at 100% 0%, rgba(52,211,153,0.08), transparent 55%)",
        }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-sm font-semibold text-zinc-100 group-hover:text-white">
            {repo.name}
          </p>
          {repo.description && (
            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-zinc-500">
              {repo.description}
            </p>
          )}
        </div>
        {repo.private && (
          <span className="shrink-0 rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-400/90">
            Private
          </span>
        )}
      </div>
      <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400/80" />
          {repo.language || "—"}
        </span>
        <span className="inline-flex items-center gap-1 text-zinc-400">
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z" />
          </svg>
          {repo.stargazers_count ?? 0}
        </span>
        <span className="ml-auto font-mono text-[10px] text-zinc-600">
          {formatDate(repo.pushed_at || repo.updated_at)}
        </span>
      </div>
    </motion.a>
  );
}
