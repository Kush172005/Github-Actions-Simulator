import { motion } from "framer-motion";
import { easeOut } from "../../lib/easing.js";

const lines = [
  ["Stop", "Waiting."],
  ["Start", "Shipping."],
];

const wordVariants = {
  hidden: {
    opacity: 0,
    y: 40,
    filter: "blur(12px)",
  },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      delay: i * 0.08,
      duration: 0.65,
      ease: easeOut,
    },
  }),
};

const lineContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
};

export function HeroText() {
  let wordIndex = 0;
  return (
    <div className="relative z-10 max-w-5xl mx-auto text-center px-4">
      <motion.div
        variants={lineContainer}
        initial="hidden"
        animate="visible"
        className="space-y-2 sm:space-y-3"
      >
        {lines.map((lineWords, lineNum) => (
          <div
            key={lineNum}
            className="flex flex-wrap justify-center gap-x-3 gap-y-1 sm:gap-x-4"
          >
            {lineWords.map((word) => {
              const i = wordIndex++;
              const isAccent = lineNum === 1;
              return (
                <motion.span
                  key={`${lineNum}-${word}`}
                  custom={i}
                  variants={wordVariants}
                  className={
                    isAccent
                      ? "inline-block text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-emerald-200 via-emerald-400 to-cyan-400 drop-shadow-[0_0_40px_rgba(52,211,153,0.35)]"
                      : "inline-block text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-zinc-100 via-white to-zinc-400"
                  }
                >
                  {word}
                </motion.span>
              );
            })}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
