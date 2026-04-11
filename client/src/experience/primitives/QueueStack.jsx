import { motion } from "framer-motion";

const JOBS = [
  { id: "8f2a", state: "running" },
  { id: "3c91", state: "queued" },
  { id: "1d44", state: "queued" },
];

export function QueueStack({ highlight = false, activeJob = "142" }) {
  return (
    <div className="relative w-full max-w-[200px] rounded-lg border border-amber-500/25 bg-zinc-950/80 p-2 ring-1 ring-amber-500/15">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/90">
          Redis queue
        </span>
        <span className="font-mono text-[9px] text-zinc-500">LIST jobs</span>
      </div>
      <div className="space-y-1">
        {JOBS.map((j, i) => (
          <motion.div
            key={j.id}
            initial={false}
            animate={{
              opacity: highlight ? 1 : 0.45,
              x: highlight ? 0 : -4,
            }}
            transition={{ delay: highlight ? i * 0.06 : 0, duration: 0.35 }}
            className={`flex items-center justify-between rounded border px-2 py-1 font-mono text-[10px] ${
              j.state === "running"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-zinc-700/80 bg-zinc-900/80 text-zinc-500"
            }`}
          >
            <span>#{j.id}</span>
            <span className="text-[9px] uppercase">{j.state}</span>
          </motion.div>
        ))}
      </div>
      <motion.p
        initial={false}
        animate={{ opacity: highlight ? 1 : 0.35 }}
        className="mt-2 font-mono text-[10px] text-amber-300/90"
      >
        Queued job #{activeJob}
      </motion.p>
    </div>
  );
}
