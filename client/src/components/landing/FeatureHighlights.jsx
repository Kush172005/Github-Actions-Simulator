import { motion } from "framer-motion";
import { easeSoft } from "../../lib/easing.js";

const features = [
  {
    title: "Async execution",
    body: "Jobs leave the hot path instantly. Celery workers pull from Redis with fair scheduling and back-pressure you can see.",
    accent: "from-violet-500/20 to-fuchsia-500/10",
    border: "border-violet-500/25",
  },
  {
    title: "Real-time logs",
    body: "WebSocket fan-out from workers to browser. Stream stdout like a local terminal — no polling, no stale status.",
    accent: "from-cyan-500/20 to-blue-500/10",
    border: "border-cyan-500/25",
  },
  {
    title: "Distributed workers",
    body: "Scale horizontally. Same queue contract everywhere: native subprocess execution with isolated environments per job.",
    accent: "from-emerald-500/20 to-teal-500/10",
    border: "border-emerald-500/25",
  },
];

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 28, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: easeSoft },
  },
};

export function FeatureHighlights() {
  return (
    <section className="relative border-t border-zinc-800/80 bg-zinc-950 py-24">
      <div className="mx-auto max-w-6xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: easeSoft }}
          className="mb-14 text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
            Built for operators who ship daily
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-zinc-400">
            Every layer is observable: queue depth, worker health, and log throughput — not a black box.
          </p>
        </motion.div>

        <motion.ul
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          className="grid gap-6 md:grid-cols-3"
        >
          {features.map((f) => (
            <motion.li
              key={f.title}
              variants={item}
              whileHover={{ y: -4, transition: { duration: 0.25, ease: easeSoft } }}
              className={`group relative overflow-hidden rounded-2xl border ${f.border} bg-zinc-900/35 p-6 backdrop-blur-xl`}
            >
              <div
                className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${f.accent} blur-2xl transition-opacity group-hover:opacity-90`}
              />
              <h3 className="relative text-lg font-semibold text-zinc-100">{f.title}</h3>
              <p className="relative mt-3 text-sm leading-relaxed text-zinc-400">{f.body}</p>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
