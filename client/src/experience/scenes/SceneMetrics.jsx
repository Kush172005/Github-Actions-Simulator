import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { easeSoft } from "../../lib/easing.js";

function Metric({ label, value, suffix, decimals = 0 }) {
  const ref = useRef(null);
  const visible = useInView(ref, { once: true, amount: 0.6 });
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!visible) return undefined;
    const target = value;
    const start = performance.now();
    const dur = 1100;
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - (1 - p) ** 3;
      setN(target * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, value]);

  const shown =
    decimals > 0 ? n.toFixed(decimals) : Math.round(n).toLocaleString();

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-3 ring-1 ring-white/5 backdrop-blur-md"
    >
      <div className="pointer-events-none absolute -right-4 top-0 h-16 w-16 rounded-full bg-cyan-500/10 blur-2xl" />
      <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-zinc-50 sm:text-3xl">
        {shown}
        <span className="ml-1 text-base font-normal text-zinc-500">{suffix}</span>
      </p>
    </div>
  );
}

export function SceneMetrics() {
  return (
    <div className="relative w-full border-y border-cyan-500/10 bg-zinc-950 py-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_0%,rgba(34,211,238,0.08),transparent)]" />
      <div className="relative z-10 mx-auto max-w-6xl px-2 lg:px-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.45, ease: easeSoft }}
          className="mb-4 px-1"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-400/90">
            Live throughput
          </p>
          <h2 className="mt-0.5 text-lg font-bold text-zinc-50 sm:text-xl">
            Numbers that move with your fleet
          </h2>
        </motion.div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
          <Metric label="Builds / sec" value={128} suffix="" />
          <Metric label="P50 latency" value={42} suffix="ms" />
          <Metric label="Success rate" value={99.97} suffix="%" decimals={2} />
        </div>
      </div>
    </div>
  );
}
