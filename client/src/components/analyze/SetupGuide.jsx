import { useState } from "react";
import { safePlainText } from "../../lib/sanitize.js";

export function SetupGuide({ steps }) {
  const [copied, setCopied] = useState(null);
  if (!steps?.length) {
    return <p className="text-xs text-zinc-500">No setup steps suggested.</p>;
  }

  async function copy(text, id) {
    const t = safePlainText(text);
    try {
      await navigator.clipboard.writeText(t);
      setCopied(id);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  }

  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const id = `step-${i}`;
        const cmd = s.command ? safePlainText(s.command) : "";
        return (
          <li
            key={id}
            className="rounded-xl border border-white/[0.06] bg-zinc-900/45 p-4"
          >
            <p className="text-sm font-semibold text-zinc-100">
              {i + 1}. {safePlainText(s.title)}
            </p>
            {s.notes && (
              <p className="mt-2 text-xs text-zinc-400 whitespace-pre-wrap">
                {safePlainText(s.notes)}
              </p>
            )}
            {cmd && (
              <div className="mt-3 flex items-start gap-2">
                <pre className="flex-1 overflow-x-auto rounded-lg bg-black/40 p-3 text-[11px] leading-relaxed text-emerald-200/90">
                  {cmd}
                </pre>
                <button
                  type="button"
                  onClick={() => copy(cmd, id)}
                  className="shrink-0 rounded-lg border border-white/[0.08] px-2 py-1 text-[10px] font-semibold text-zinc-300 hover:border-emerald-500/30"
                >
                  {copied === id ? "Copied" : "Copy"}
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
