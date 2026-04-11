import { useEffect, useRef, useState, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { easeSoft } from "../../lib/easing.js";

const SCRIPT = [
  { text: "→ Webhook received · main · push", tone: "muted" },
  { text: "→ Queue job #8f2a · priority: normal", tone: "blue" },
  { text: "→ Cloning github.com/acme/service…", tone: "default" },
  { text: "→ Installing dependencies (pnpm)…", tone: "default" },
  { text: "→ Running build pipeline…", tone: "default" },
  { text: "✓ Build succeeded in 42s", tone: "success" },
  { text: "→ Streaming logs to client…", tone: "muted" },
];

const toneClass = {
  default: "text-zinc-200",
  muted: "text-zinc-500",
  blue: "text-sky-400",
  success: "text-emerald-400 font-medium",
};

export const Terminal = forwardRef(function Terminal({ active = false }, ref) {
  const [lines, setLines] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!active) {
      setLines([]);
      return undefined;
    }

    let cancelled = false;
    setLines([]);

    (async () => {
      for (let i = 0; i < SCRIPT.length; i++) {
        if (cancelled) return;
        const { text, tone } = SCRIPT[i];
        for (let c = 0; c <= text.length; c++) {
          if (cancelled) return;
          await new Promise((r) => setTimeout(r, 11));
          setLines((prev) => {
            const next = [...prev];
            next[i] = { text: text.slice(0, c), tone };
            return next;
          });
        }
        await new Promise((r) => setTimeout(r, 160));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <motion.div
      ref={ref}
      initial={false}
      animate={
        active
          ? { opacity: 1, y: 0, filter: "blur(0px)" }
          : { opacity: 0.35, y: 12, filter: "blur(1px)" }
      }
      transition={{ duration: 0.55, ease: easeSoft }}
      className="w-full max-w-md overflow-hidden rounded-xl border border-zinc-700/80 bg-[#1e1e1e] shadow-2xl shadow-black/50 ring-1 ring-white/5"
    >
      <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/90" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/90" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/90" />
        </div>
        <span className="ml-2 font-mono text-[11px] text-zinc-500">worker — bash</span>
      </div>
      <div
        ref={scrollRef}
        className="max-h-[220px] overflow-y-auto px-4 py-3 font-mono text-[12px] leading-relaxed sm:text-[13px]"
      >
        <AnimatePresence mode="popLayout">
          {lines.map(
            (line, i) =>
              line && (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, ease: easeSoft }}
                  className={toneClass[line.tone] || toneClass.default}
                >
                  {line.text}
                </motion.div>
              ),
          )}
        </AnimatePresence>
        {active && (
          <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse bg-emerald-400/90" />
        )}
      </div>
    </motion.div>
  );
});
