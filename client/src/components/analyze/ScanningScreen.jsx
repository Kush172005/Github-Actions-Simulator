import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function ScanningScreen({ repositoryName, refBranch }) {
  const [progress, setProgress] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);

  const statusMessages = [
    "Establishing secure repository gateway...",
    "Tracing file tree topology...",
    "Inspecting configuration manifest schemas...",
    "Scanning GitHub Action workflows...",
    "Querying package registry ecosystems...",
    "Deploying OpenRouter reasoning contexts...",
    "Structuring deep SRE vulnerability mapping...",
    "Brewing final intelligence report...",
  ];

  // 1. Smooth progress simulation (stops at 99% until backend responds)
  useEffect(() => {
    const startTime = Date.now();
    const duration = 16000; // Target ~16 seconds for full progress bar sweep

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const calculated = Math.min(99, Math.floor((elapsed / duration) * 100));
      
      setProgress((prev) => {
        if (prev < calculated) return calculated;
        return prev;
      });

      if (calculated >= 99) {
        clearInterval(interval);
      }
    }, 150);

    return () => clearInterval(interval);
  }, []);

  // 2. Cycle status messages slowly to keep user relaxed
  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIdx((prev) => (prev + 1) % statusMessages.length);
    }, 2800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto mt-6 max-w-2xl overflow-hidden rounded-2xl border border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl p-8 text-center relative shadow-2xl">
      {/* Background Dot Grid for Depth */}
      <div className="absolute inset-0 bg-dot-grid opacity-10 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center justify-center py-8">
        
        {/* Hypnotic Glowing Orb & Radar System */}
        <div className="relative flex items-center justify-center w-52 h-52 mb-8">
          
          {/* Pulsing Outer Ring */}
          <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-pulse-ring" />
          <div className="absolute inset-4 rounded-full border border-cyan-500/10 animate-pulse-ring [animation-delay:1s]" />

          {/* Rotating Radar Crosshair */}
          <svg className="absolute inset-2 text-zinc-800/40 w-[calc(100%-16px)] h-[calc(100%-16px)] animate-rotate-slow" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 4" />
            <circle cx="50" cy="50" r="32" fill="none" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="50" cy="50" r="16" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 1" />
            <line x1="50" y1="2" x2="50" y2="98" stroke="currentColor" strokeWidth="0.3" />
            <line x1="2" y1="50" x2="98" y2="50" stroke="currentColor" strokeWidth="0.3" />
          </svg>

          {/* Glowing Ambient Backdrop Aura */}
          <div className="absolute w-24 h-24 rounded-full bg-emerald-500/20 animate-breath-slow" />

          {/* Central Solid Quantum Core */}
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-400 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-black/90 flex flex-col items-center justify-center font-mono">
              <span className="text-xs font-bold text-gradient-green leading-none">{progress}%</span>
              <span className="text-[7px] text-zinc-500 uppercase tracking-widest mt-0.5">SCAN</span>
            </div>
          </div>
        </div>

        {/* Text descriptions */}
        <h3 className="text-sm font-semibold text-zinc-200 tracking-wide">
          Brewing Repository Insights
        </h3>
        <p className="mt-1.5 text-[11px] font-mono text-zinc-500">
          {repositoryName} {refBranch ? `· branch: ${refBranch}` : ""}
        </p>

        {/* Dynamic Status message reveal */}
        <div className="h-6 mt-6 flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={statusIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="text-xs font-mono text-emerald-400/90 text-center tracking-wide"
            >
              {statusMessages[statusIdx]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Aesthetic Progress Bar */}
        <div className="w-64 h-1 bg-zinc-900 rounded-full mt-6 overflow-hidden border border-white/[0.04] relative">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full"
            style={{ width: `${progress}%` }}
            layout
          />
        </div>

        {/* Micro-notes to reassure the user */}
        <p className="mt-4 text-[10px] text-zinc-600 font-sans">
          This may take up to a minute depending on repository size and fallback load.
        </p>
      </div>
    </div>
  );
}
