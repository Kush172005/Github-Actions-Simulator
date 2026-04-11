import { motion } from "framer-motion";
import { easeSoft } from "../../lib/easing.js";

const lanes = [
  { id: "a", color: "from-violet-500/40 to-fuchsia-500/20", bar: "bg-violet-400" },
  { id: "b", color: "from-cyan-500/40 to-blue-500/20", bar: "bg-cyan-400" },
  { id: "c", color: "from-emerald-500/40 to-teal-500/20", bar: "bg-emerald-400" },
];

function MiniLane({ lane }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-white/10 bg-zinc-900/60 p-3 ring-1 ring-white/5 backdrop-blur-md`}
    >
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${lane.color} blur-2xl`}
      />
      <div className="relative mb-2 flex items-center justify-between">
        <span className="font-mono text-[10px] text-zinc-500">worker pool</span>
        <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9px] text-emerald-400">
          RUNNING
        </span>
      </div>
      <div className="relative flex h-10 items-center gap-1">
        {[0, 1, 2, 3].map((i) => (
          <motion.span
            key={i}
            className={`h-2.5 w-2.5 rounded-full ${lane.bar} shadow-[0_0_12px_currentColor]`}
            animate={{ x: [0, 56, 0], opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 2.4 + i * 0.15,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.22,
            }}
          />
        ))}
      </div>
      <div className="mt-2 space-y-1 font-mono text-[9px] leading-tight text-zinc-500">
        <p className="text-emerald-400/90">✓ build #{lane.id} · 38s</p>
        <p className="text-zinc-600">streaming logs…</p>
      </div>
    </div>
  );
}

export function SceneParallel() {
  return (
    <div className="relative w-full border-y border-violet-500/10 bg-zinc-950 py-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,rgba(139,92,246,0.12),transparent)]" />
      <div className="relative z-10 mx-auto max-w-6xl px-2 lg:px-3">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.5, ease: easeSoft }}
          className="mb-4 flex flex-col gap-1 px-1"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-violet-400/90">
            Parallel execution
          </p>
          <h2 className="text-lg font-bold text-zinc-50 sm:text-xl">
            Run builds in parallel. No waiting.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
          {lanes.map((lane) => (
            <motion.div
              key={lane.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, ease: easeSoft }}
            >
              <MiniLane lane={lane} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
