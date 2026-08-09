import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function ScanningScreen({ repositoryName, refBranch }) {
  const [activeStep, setActiveStep] = useState(0);
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);

  const steps = [
    { label: "Establishing handshake with GitHub API", duration: 1200 },
    { label: "Indexing repository tree & directory structure", duration: 1500 },
    { label: "Extracting dependency manifests & YAML workflows", duration: 1800 },
    { label: "Executing local static security & lint checks", duration: 2000 },
    { label: "Querying npm and PyPI registries for latest packages", duration: 2500 },
    { label: "Provisioning OpenRouter context & starting Fallback Chain", duration: 3000 },
    { label: "Synthesizing SRE findings with AI reasoning models", duration: 8000 },
  ];

  const mockLogPool = [
    "git fetch origin --depth=1",
    "analyzing .github/workflows/ci.yml...",
    "found actions/checkout@v3 -> ref float check active",
    "found package.json -> ecosystem Node.js detected",
    "analyzing dependencies in requirements.txt...",
    "checking registry: https://registry.npmjs.org/react...",
    "checking registry: https://pypi.org/pypi/fastapi...",
    "found 12 workflow files, processing 4 in this snapshot...",
    "analyzing matrix build parameters...",
    "caching context for session optimizations...",
    "connecting to poolside/laguna-s-2.1:free...",
    "fallback triggered -> invoking nvidia/nemotron-3-ultra-550b-a55b:free...",
    "synthesizing vulnerability metrics...",
    "generating actionable fix guides..."
  ];

  // 1. Handle step transitions
  useEffect(() => {
    let timer;
    if (activeStep < steps.length - 1) {
      timer = setTimeout(() => {
        setActiveStep((prev) => prev + 1);
      }, steps[activeStep].duration);
    }
    return () => clearTimeout(timer);
  }, [activeStep]);

  // 2. Generate rolling log output
  useEffect(() => {
    const logInterval = setInterval(() => {
      const randomLog = mockLogPool[Math.floor(Math.random() * mockLogPool.length)];
      const timestamp = new Date().toISOString().split("T")[1].slice(0, 8);
      setLogs((prev) => [...prev, `[${timestamp}] ${randomLog}`].slice(-40));
    }, 450);

    return () => clearInterval(logInterval);
  }, []);

  // 3. Keep logs scrolled down
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="mx-auto mt-6 max-w-4xl overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c0c0e] shadow-2xl relative">
      {/* Laser Scan Line Sweeper */}
      <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-40 animate-scanline z-10" />

      {/* Header section with scanning indicator */}
      <div className="border-b border-white/[0.05] bg-zinc-900/40 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
              Scanning Repository
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500 font-mono">
            {repositoryName} {refBranch ? `· ref: ${refBranch}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-black/40 px-3 py-1.5 border border-white/[0.04] font-mono text-[10px] text-zinc-400">
          <span className="text-emerald-400 animate-pulse">●</span> ACTIVE_SCAN_RUN
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-white/[0.05]">
        {/* Left Side: Animated Steps */}
        <div className="p-6 md:col-span-5 space-y-6 bg-zinc-950/20">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4">
            Analysis Pipeline Steps
          </h3>
          <div className="space-y-4">
            {steps.map((step, idx) => {
              const isCompleted = idx < activeStep;
              const isActive = idx === activeStep;
              const isPending = idx > activeStep;

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`flex items-start gap-3 transition-colors duration-300 ${
                    isActive ? "text-emerald-300" : isCompleted ? "text-zinc-400" : "text-zinc-600"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isCompleted ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] text-emerald-400 border border-emerald-500/30">
                        ✓
                      </span>
                    ) : isActive ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] text-emerald-400 border border-emerald-400 animate-pulse">
                        ⟳
                      </span>
                    ) : (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] text-zinc-500 border border-white/[0.04]">
                        ○
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium leading-relaxed font-sans">
                      {step.label}
                    </p>
                    {isActive && (
                      <motion.div
                        className="h-1 bg-emerald-500/30 mt-2 rounded-full overflow-hidden w-24"
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: step.duration / 1000, ease: "linear" }}
                      >
                        <div className="h-full bg-emerald-400 w-full" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Virtual Console Logs */}
        <div className="md:col-span-7 bg-[#060608] flex flex-col h-[320px] md:h-[400px]">
          <div className="flex items-center justify-between border-b border-white/[0.04] bg-[#0c0c0e] px-4 py-2 text-[10px] font-mono text-zinc-500">
            <span>CONSOLE STREAM (STDOUT)</span>
            <span className="animate-pulse text-emerald-500">SYSTEM READY</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] leading-relaxed text-zinc-400 space-y-1 selection:bg-emerald-500/25 selection:text-white">
            <AnimatePresence>
              {logs.map((log, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="whitespace-pre-wrap truncate hover:text-emerald-300 transition-colors"
                >
                  <span className="text-zinc-600 font-semibold">{`$`}</span> {log}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={logEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
