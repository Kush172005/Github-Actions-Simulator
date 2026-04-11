import { motion } from "framer-motion";
import { HeroText } from "./HeroText.jsx";
import { easeOut } from "../../lib/easing.js";

function GridBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <div
        className="absolute inset-0 bg-[size:48px_48px] bg-grid-fade opacity-[0.35]"
        style={{ maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)" }}
      />
      <motion.div
        className="absolute -left-1/4 top-0 h-[120%] w-[150%] rounded-full bg-gradient-to-br from-violet-600/20 via-emerald-500/10 to-cyan-500/15 blur-3xl"
        animate={{ opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-1/4 bottom-0 h-[80%] w-[80%] rounded-full bg-gradient-to-tl from-blue-600/15 to-purple-600/10 blur-3xl animate-gradient-shift"
        aria-hidden
      />
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pt-24 pb-16">
      <GridBackground />
      <HeroText />
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85, duration: 0.6, ease: easeOut }}
        className="relative z-10 mt-10 max-w-2xl text-center text-base text-zinc-400 sm:text-lg"
      >
        A distributed execution engine for CI/CD. Webhook to worker in milliseconds —
        real-time logs, real infrastructure, zero ceremony.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.05, duration: 0.55, ease: easeOut }}
        className="relative z-10 mt-12"
      >
        <motion.a
          href="#architecture"
          className="group relative inline-flex items-center justify-center overflow-hidden rounded-full px-8 py-3.5 text-sm font-semibold text-zinc-950 shadow-glow shadow-emerald-500/40"
          style={{ background: "linear-gradient(135deg, #34d399 0%, #22d3ee 100%)" }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 420, damping: 24 }}
        >
          <span className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
          <span className="relative">See the pipeline</span>
          <motion.span
            className="relative ml-2 inline-block"
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            →
          </motion.span>
        </motion.a>
      </motion.div>
    </section>
  );
}
