import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const AVATAR_URL = "https://avatars.githubusercontent.com/u/1024025?v=4";

function CommitHash() {
  const [hash] = useState(() =>
    Math.random().toString(16).slice(2, 9).toUpperCase()
  );
  return <span className="font-mono text-emerald-400">{hash}</span>;
}

function TimeSince() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="text-zinc-500 text-xs">
      {secs < 5 ? "just now" : `${secs}s ago`}
    </span>
  );
}

export function GitHubCommitCard({ visible, onDeployed }) {
  const [deploying, setDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);

  useEffect(() => {
    if (!visible) {
      setDeploying(false);
      setDeployed(false);
    }
  }, [visible]);

  const handleDeploy = () => {
    if (deploying || deployed) return;
    setDeploying(true);
    setTimeout(() => {
      setDeployed(true);
      setDeploying(false);
      onDeployed?.();
    }, 1200);
  };

  // Auto-trigger after card becomes visible
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(handleDeploy, 1400);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full"
        >
          <div
            className="glass-card rounded-xl overflow-hidden"
            style={{
              boxShadow: deployed
                ? "0 0 30px rgba(52,211,153,0.2), 0 0 1px rgba(52,211,153,0.4)"
                : "0 4px 40px rgba(0,0,0,0.5)",
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.05]" style={{ background: "#0f0f12" }}>
              <svg className="w-4 h-4 text-zinc-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span className="text-xs text-zinc-400 font-medium">acme / service</span>
              <span className="ml-auto text-xs text-zinc-600">main</span>
            </div>

            {/* Commit info */}
            <div className="p-4">
              <div className="flex items-start gap-3">
                <img
                  src={AVATAR_URL}
                  alt="committer"
                  className="w-8 h-8 rounded-full ring-1 ring-white/10 flex-shrink-0"
                  style={{ filter: "brightness(0.9)" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-zinc-100">feat: add async deploy pipeline</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-zinc-500">kush-dev</span>
                    <span className="text-zinc-700">·</span>
                    <CommitHash />
                    <span className="text-zinc-700">·</span>
                    <TimeSince />
                  </div>
                </div>
              </div>

              {/* File diffs summary */}
              <div className="mt-3 flex items-center gap-3 text-xs font-mono">
                <span className="text-zinc-600">3 files changed</span>
                <span className="text-emerald-400">+142</span>
                <span className="text-red-400">-18</span>
              </div>

              {/* Branch + CI status */}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${deployed ? "bg-emerald-400" : deploying ? "bg-amber-400 animate-pulse" : "bg-zinc-600"}`} />
                  <span className={deployed ? "text-emerald-400" : deploying ? "text-amber-400" : "text-zinc-500"}>
                    {deployed ? "webhook dispatched" : deploying ? "dispatching..." : "ready to deploy"}
                  </span>
                </div>

                <motion.button
                  onClick={handleDeploy}
                  disabled={deploying || deployed}
                  className="relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold overflow-hidden"
                  style={{
                    background: deployed
                      ? "rgba(52,211,153,0.15)"
                      : "rgba(52,211,153,0.1)",
                    border: `1px solid ${deployed ? "rgba(52,211,153,0.5)" : "rgba(52,211,153,0.25)"}`,
                    color: deployed ? "#34d399" : "#6ee7b7",
                  }}
                  whileHover={!deployed && !deploying ? { scale: 1.04 } : {}}
                  whileTap={!deployed && !deploying ? { scale: 0.96 } : {}}
                >
                  {deployed ? (
                    <>
                      <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Dispatched
                    </>
                  ) : deploying ? (
                    <>
                      <div className="w-3 h-3 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                      Push ⌘↵
                    </>
                  )}
                </motion.button>
              </div>
            </div>

            {/* Webhook pulse bar */}
            {deployed && (
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                style={{ transformOrigin: "left", height: 2, background: "linear-gradient(90deg, #34d399, #22d3ee)" }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
