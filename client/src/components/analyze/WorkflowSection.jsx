import { safePlainText } from "../../lib/sanitize.js";

export function WorkflowSection({ analyzers }) {
  const wf = (analyzers || []).find((a) => a.analyzer === "workflows");
  const summaries = wf?.data?.workflows || [];
  if (!summaries.length) {
    return (
      <p className="text-xs text-zinc-500">
        No workflow YAML was available in the analyzed snapshot.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {summaries.map((w) => (
        <div
          key={w.path}
          className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-4"
        >
          <p className="font-mono text-xs font-semibold text-emerald-300/90">
            {safePlainText(w.path)}
          </p>
          {Array.isArray(w.jobs) && w.jobs.length > 0 && (
            <p className="mt-2 text-[11px] text-zinc-400">
              Jobs:{" "}
              <span className="text-zinc-200">
                {w.jobs.slice(0, 12).map(safePlainText).join(", ")}
              </span>
            </p>
          )}
          {Array.isArray(w.uses_sample) && w.uses_sample.length > 0 && (
            <ul className="mt-2 space-y-1 text-[11px] text-zinc-500">
              {w.uses_sample.slice(0, 8).map((u) => (
                <li key={u} className="font-mono text-zinc-400">
                  {safePlainText(u)}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
