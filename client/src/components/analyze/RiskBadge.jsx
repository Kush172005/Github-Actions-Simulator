const styles = {
  LOW: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  MEDIUM: "border-amber-500/35 bg-amber-500/10 text-amber-200",
  HIGH: "border-red-500/35 bg-red-500/10 text-red-200",
};

export function RiskBadge({ level }) {
  const key = level in styles ? level : "LOW";
  return (
    <span
      className={`inline-flex items-center rounded-lg border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${styles[key]}`}
    >
      Risk · {key}
    </span>
  );
}
