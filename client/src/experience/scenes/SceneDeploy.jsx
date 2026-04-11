import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { easeSoft } from "../../lib/easing.js";

const SNIPPET = [
  "import { deploy } from \"@acme/runner\";",
  "",
  "export async function onPush(ctx) {",
  "  await deploy({ branch: ctx.branch });",
  "}",
];

function CodeEditorMock({ phase, onCommit }) {
  const [lines, setLines] = useState([]);
  useEffect(() => {
    if (phase < 1) return;
    let i = 0;
    const t = setInterval(() => {
      if (i >= SNIPPET.length) {
        clearInterval(t);
        return;
      }
      setLines((prev) => [...prev, SNIPPET[i]]);
      i += 1;
    }, 95);
    return () => clearInterval(t);
  }, [phase]);

  return (
    <div className="flex h-full min-h-[280px] flex-col overflow-hidden rounded-xl border border-zinc-700/80 bg-[#0c0c0e] shadow-xl ring-1 ring-white/5">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500/80" />
          <span className="h-2 w-2 rounded-full bg-amber-500/80" />
          <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
        </div>
        <span className="font-mono text-[10px] text-zinc-500">deploy.ts — acme/api</span>
      </div>
      <div className="flex flex-1 gap-0 overflow-hidden font-mono text-[11px] leading-relaxed text-zinc-300 sm:text-xs">
        <div className="select-none border-r border-zinc-800/80 bg-zinc-900/50 px-2 py-3 text-right text-zinc-600">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <pre className="flex-1 overflow-auto p-3 text-zinc-200">
          {lines.join("\n")}
          <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-sky-400" />
        </pre>
      </div>
      <div className="border-t border-zinc-800/80 px-3 py-2">
        <motion.button
          type="button"
          disabled={phase < 2}
          onClick={() => phase === 2 && onCommit?.()}
          className="w-full rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 py-2 text-[11px] font-semibold text-white shadow-lg shadow-emerald-500/20 disabled:opacity-40"
          whileHover={{ scale: phase >= 2 ? 1.02 : 1 }}
          whileTap={{ scale: phase >= 2 ? 0.98 : 1 }}
        >
          Commit & push
        </motion.button>
      </div>
    </div>
  );
}

function GitHubCommitCard({ visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: 80, rotate: 1 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="relative flex h-full min-h-[280px] flex-col justify-between overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-900/60 p-4 shadow-xl ring-1 ring-white/5 backdrop-blur-md"
        >
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-950 ring-1 ring-white/10">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.43 9.8 8.21 11.39.6.11.79-.26.79-.57v-2.23c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1.1.11-.86.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23.96-.27 1.98-.4 3-.41 1.02.01 2.04.14 3 .41 2.29-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .31.21.69.79.57C20.57 21.8 24 17.31 24 12 24 5.37 18.63 0 12 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-100">acme / api</p>
                <p className="font-mono text-[10px] text-zinc-500">main · 8f2a9c1</p>
              </div>
            </div>
            <p className="text-sm text-zinc-300">chore: wire distributed runner</p>
          </div>
          <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3">
            <span className="font-mono text-[10px] text-emerald-400">● checks passing</span>
            <span className="text-[10px] text-zinc-500">just now</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SceneDeploy() {
  const [phase, setPhase] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const a = setTimeout(() => setPhase(1), 400);
    const b = setTimeout(() => setPhase(2), 2200);
    const c = setTimeout(() => setPhase(3), 3600);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
      clearTimeout(c);
    };
  }, []);

  return (
    <div className="relative grid min-h-[calc(100dvh-3rem)] w-full grid-cols-1 gap-2 px-2 pb-2 pt-16 lg:grid-cols-12 lg:gap-3 lg:px-3 lg:pt-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(139,92,246,0.14),transparent)]" />
      <motion.div
        className="relative z-10 lg:col-span-5"
        layout
        transition={{ type: "spring", stiffness: 260, damping: 32 }}
        animate={
          phase >= 3
            ? { scale: 0.94, x: 0 }
            : { scale: 1, x: 0 }
        }
      >
        <CodeEditorMock phase={phase} onCommit={() => setPhase(3)} />
      </motion.div>
      <motion.div
        className="relative z-10 flex flex-col justify-center lg:col-span-4"
        animate={
          phase >= 3
            ? { x: 0, scale: 1.02 }
            : { x: 0, scale: 1 }
        }
        transition={{ duration: 0.65, ease: easeSoft }}
      >
        <GitHubCommitCard visible={phase >= 2} />
      </motion.div>
      <div className="relative z-10 flex flex-col justify-center gap-2 lg:col-span-3">
        <motion.h1
          initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.2, duration: 0.55, ease: easeSoft }}
          className="text-2xl font-bold leading-tight tracking-tight text-zinc-50 sm:text-3xl"
        >
          Push code.
          <br />
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Watch it deploy.
          </span>
        </motion.h1>
        <p className="text-[11px] leading-snug text-zinc-500">
          Webhook → queue → worker → logs. One continuous pipe.
        </p>
      </div>
    </div>
  );
}
