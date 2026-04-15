import { safePlainText } from "../../lib/sanitize.js";

export function DependencySection({ analyzers }) {
  const dep = (analyzers || []).find((a) => a.analyzer === "dependencies");
  const eco = dep?.data?.ecosystems || [];
  const findings = dep?.findings || [];

  return (
    <div className="space-y-3">
      {eco.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {eco.map((e) => (
            <span
              key={`${e.type}-${e.path}`}
              className="rounded-lg border border-white/[0.08] bg-zinc-900/50 px-2.5 py-1 text-[11px] text-zinc-300"
            >
              {safePlainText(e.type)}
              {e.path ? ` · ${safePlainText(e.path)}` : ""}
              {typeof e.dependency_count === "number"
                ? ` · ${e.dependency_count} deps`
                : typeof e.line_count === "number"
                  ? ` · ${e.line_count} lines`
                  : ""}
            </span>
          ))}
        </div>
      )}
      {findings.length > 0 && (
        <ul className="space-y-2">
          {findings.slice(0, 12).map((f) => (
            <li
              key={f.id}
              className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-xs text-zinc-400"
            >
              <span className="font-semibold text-zinc-200">{safePlainText(f.title)}</span>
              <span className="block mt-1 text-zinc-500">{safePlainText(f.detail)}</span>
            </li>
          ))}
        </ul>
      )}
      {!eco.length && !findings.length && (
        <p className="text-xs text-zinc-500">No dependency manifests detected in the snapshot.</p>
      )}
    </div>
  );
}
