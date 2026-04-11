import { motion } from "framer-motion";
import { easeSoft } from "../../lib/easing.js";

export function SceneCta() {
  return (
    <div className="relative w-full overflow-hidden border-t border-white/10 bg-zinc-950 py-10">
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,rgba(52,211,153,0.14),transparent)]"
        animate={{ opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: easeSoft }}
          className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl"
        >
          Ship faster. Sleep better.
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.08, duration: 0.45, ease: easeSoft }}
        >
          <motion.button
            type="button"
            className="relative overflow-hidden rounded-full border border-emerald-400/40 bg-emerald-500/15 px-12 py-3.5 text-sm font-semibold text-emerald-200 shadow-[0_0_40px_-8px_rgba(52,211,153,0.55)] backdrop-blur-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
          >
            <span className="relative z-10">Request access</span>
            <motion.span
              className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-400/25 to-emerald-500/0"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
            />
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
