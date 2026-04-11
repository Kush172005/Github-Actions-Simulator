import {
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";

const LOG_SCRIPT = [
  { t: "git clone https://github.com/acme/api.git", c: "text-sky-400" },
  { t: "remote: Enumerating objects: 842, done.", c: "text-zinc-500" },
  { t: "→ pnpm install — frozen-lockfile · 1.1s", c: "text-zinc-300" },
  { t: "→ vitest run — 42 passed, 0 failed", c: "text-emerald-400" },
  { t: "→ build bundle · esbuild · 380ms", c: "text-zinc-300" },
  { t: "✓ artifact digest sha256:9c1e…", c: "text-emerald-300 font-medium" },
  { t: "→ pushing layers to registry… done", c: "text-emerald-400" },
];

export const LiveTerminal = forwardRef(function LiveTerminal(_props, ref) {
  const bodyRef = useRef(null);
  const scrollRef = useRef(null);
  const cancelRef = useRef(false);

  const reset = useCallback(() => {
    cancelRef.current = true;
    if (bodyRef.current) bodyRef.current.innerHTML = "";
  }, []);

  const startStream = useCallback(() => {
    cancelRef.current = false;
    if (bodyRef.current) bodyRef.current.innerHTML = "";
    const body = bodyRef.current;
    const wrap = scrollRef.current;
    if (!body) return;

    let i = 0;
    const step = () => {
      if (cancelRef.current) return;
      if (i >= LOG_SCRIPT.length) return;
      const row = document.createElement("div");
      row.className = `whitespace-pre-wrap break-all border-l-2 border-zinc-800 pl-2 font-mono text-[11px] leading-snug sm:text-xs ${LOG_SCRIPT[i].c}`;
      row.textContent = LOG_SCRIPT[i].t;
      body.appendChild(row);
      if (wrap) wrap.scrollTop = wrap.scrollHeight;
      i += 1;
      const delay = i === 1 ? 35 : 42 + Math.random() * 30;
      setTimeout(step, delay);
    };
    step();
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      startStream,
      reset,
    }),
    [startStream, reset],
  );

  return (
    <div className="flex h-full min-h-[260px] flex-col overflow-hidden rounded-xl border border-zinc-700/90 bg-[#121214] shadow-2xl ring-1 ring-white/5">
      <div className="flex items-center gap-2 border-b border-zinc-800/90 px-3 py-2">
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500/90" />
          <span className="h-2 w-2 rounded-full bg-amber-500/90" />
          <span className="h-2 w-2 rounded-full bg-emerald-500/90" />
        </div>
        <span className="font-mono text-[10px] text-zinc-500">zsh — 80×32 — utf-8</span>
      </div>
      <div
        ref={scrollRef}
        className="relative flex-1 overflow-y-auto overflow-x-hidden px-3 py-2"
      >
        <div ref={bodyRef} className="space-y-1 pb-5" />
        <span className="ml-0.5 inline-block h-3.5 w-2 animate-pulse bg-emerald-400" />
      </div>
    </div>
  );
});
