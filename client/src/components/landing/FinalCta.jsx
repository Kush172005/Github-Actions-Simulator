import { motion } from "framer-motion";
import { easeSoft } from "../../lib/easing.js";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-zinc-800/80 py-28">
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_100%,rgba(52,211,153,0.12),transparent)]"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: easeSoft }}
          className="text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl"
        >
          Ready when your repo is.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.06, duration: 0.5, ease: easeSoft }}
          className="mt-4 text-zinc-400"
        >
          Phase 2 wires your org — SSO, policies, and fleet-wide rollouts. For now: feel the pipeline.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.12, duration: 0.5, ease: easeSoft }}
          className="mt-10"
        >
          <motion.button
            type="button"
            className="inline-flex items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-10 py-3.5 text-sm font-semibold text-emerald-300 shadow-glow shadow-emerald-500/20 backdrop-blur-sm"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
          >
            Get early access
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
