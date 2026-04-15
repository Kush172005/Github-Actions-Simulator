import { safePlainText } from "../../lib/sanitize.js";

const severityClass = {
  critical: "border-red-500/40 bg-red-500/10 text-red-100",
  high: "border-orange-500/35 bg-orange-500/10 text-orange-100",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-100",
  low: "border-zinc-500/25 bg-zinc-500/10 text-zinc-200",
  info: "border-sky-500/25 bg-sky-500/10 text-sky-100",
};

export function CriticalIssues({ analyzers }) {
  const rows = [];
  for (const a of analyzers || []) {
    for (const f of a.findings || []) {
      const sev = (f.severity || "low").toLowerCase();
      if (sev === "critical" || sev === "high") {
        rows.push({ ...f, analyzer: a.analyzer });
      }
    }
  }
  rows.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    const sa = (a.severity || "low").toLowerCase();
    const sb = (b.severity || "low").toLowerCase();
    return (order[sa] ?? 9) - (order[sb] ?? 9);
  });

  if (!rows.length) {
    return (
      <p className="rounded-xl border border-white/[0.06] bg-zinc-900/40 px-4 py-3 text-xs text-zinc-500">
        No critical or high-severity findings from static analysis.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {rows.slice(0, 24).map((f) => {
        const sev = (f.severity || "low").toLowerCase();
        const cls = severityClass[sev] || severityClass.low;
        return (
          <li
            key={`${f.analyzer}-${f.id}-${f.path || ""}`}
            className={`rounded-xl border px-4 py-3 ${cls}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">
              {safePlainText(f.severity)} · {safePlainText(f.analyzer)}
              {f.path ? ` · ${safePlainText(f.path)}` : ""}
            </p>
            <p className="mt-1 text-sm font-semibold">{safePlainText(f.title)}</p>
            <p className="mt-1 text-xs leading-relaxed opacity-90 whitespace-pre-wrap">
              {safePlainText(f.detail)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
