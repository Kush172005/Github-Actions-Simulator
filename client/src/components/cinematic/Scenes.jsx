import { useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CodeEditorMock } from "../cinematic/CodeEditorMock.jsx";
import { GitHubCommitCard } from "../cinematic/GitHubCommitCard.jsx";
import { PipelineNode } from "../cinematic/PipelineNode.jsx";
import { DataPacket, QueueStack, QueuePanel } from "../cinematic/FlowElements.jsx";
import { LiveTerminal } from "../cinematic/LiveTerminal.jsx";
import { MetricsScene } from "../cinematic/MetricsScene.jsx";
import { ParallelBuildsScene } from "../cinematic/ParallelBuildsScene.jsx";
import { usePipelineTimeline } from "../../hooks/usePipelineTimeline.js";
import {
  IconGitHub,
  IconServer,
  IconDatabase,
  IconCpu,
  IconTerminal,
} from "../icons/PipelineIcons.jsx";

/* ────────────────────────────────────────────────────────── */
/* SCENE 1: HERO — Split editor + commit card                */
/* ────────────────────────────────────────────────────────── */

function AmbientOrb({ style, color, delay = 0 }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ ...style, background: color, filter: "blur(80px)" }}
      animate={{ opacity: [0.25, 0.45, 0.25], scale: [1, 1.08, 1] }}
      transition={{ duration: 10 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

export function HeroScene() {
  const [commitReady, setCommitReady] = useState(false);
  const [deployed, setDeployed] = useState(false);

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden bg-transparent">
      {/* Ambient background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <AmbientOrb style={{ width: 600, height: 600, top: "-20%", left: "-10%" }} color="rgba(139,92,246,0.15)" delay={0} />
        <AmbientOrb style={{ width: 500, height: 500, top: "10%", right: "-15%" }} color="rgba(52,211,153,0.12)" delay={3} />
        <AmbientOrb style={{ width: 400, height: 400, bottom: "-10%", left: "30%" }} color="rgba(59,130,246,0.1)" delay={6} />
        {/* Dot grid */}
        <div className="absolute inset-0 bg-dot-grid opacity-40" style={{ maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black, transparent)" }} />
      </div>

      {/* Top text */}
      <div className="relative z-10 pt-32 pb-12 text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-mono font-medium"
          style={{
            background: "rgba(52,211,153,0.08)",
            border: "1px solid rgba(52,211,153,0.2)",
            color: "#34d399",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: "packet-pulse 1.5s infinite" }} />
          Live execution engine — v2.4.1
        </motion.div>

        <motion.h1
          className="text-5xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight leading-none"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="text-gradient-white">Push code.</span>
          <br />
          <span className="text-gradient-green">Watch it deploy.</span>
        </motion.h1>

        <motion.p
          className="mt-6 text-base sm:text-lg text-zinc-400 max-w-xl mx-auto"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
        >
          Webhook fires. FastAPI validates. Redis queues. Workers execute.<br />
          Real-time logs stream back — in milliseconds.
        </motion.p>
      </div>

      {/* Content: Editor + Commit card */}
      <div className="relative z-10 flex-1 flex items-start justify-center px-4 pb-16">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
          {/* Left: Code Editor */}
          <motion.div
            className="h-[360px] lg:h-[420px]"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <CodeEditorMock onCommitReady={() => setCommitReady(true)} isActive={true} />
          </motion.div>

          {/* Right: Commit card + status feed */}
          <div className="flex flex-col gap-4">
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <GitHubCommitCard visible={commitReady} onDeployed={() => setDeployed(true)} />
            </motion.div>

            {/* Webhook fired indicator */}
            <AnimatePresence>
              {deployed && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="glass-card rounded-xl p-4 flex items-start gap-3"
                  style={{ border: "1px solid rgba(52,211,153,0.2)" }}
                >
                  <motion.div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)" }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </motion.div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-300">Webhook dispatched</p>
                    <p className="text-xs text-zinc-500 mt-0.5 font-mono">POST /webhook/github · 200 OK · 12ms</p>
                    <p className="text-xs text-zinc-600 mt-1">Job queued. Scroll down to watch the pipeline.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scroll nudge */}
            <motion.div
              className="flex flex-col items-center gap-2 mt-2"
              initial={{ opacity: 0 }}
              animate={deployed ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 1, duration: 0.6 }}
            >
              <p className="text-xs text-zinc-600 font-mono">scroll to watch execution</p>
              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <svg className="w-5 h-5 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────── */
/* SCENE 2: SCROLL-DRIVEN PIPELINE                           */
/* ────────────────────────────────────────────────────────── */

const STEP_META = {
  gh:  { label: "GitHub Event",      desc: "Webhook dispatched on push",            color: "#a78bfa" },
  api: { label: "FastAPI Server",    desc: "Validating payload · signing check OK",  color: "#60a5fa" },
  rq:  { label: "Redis Queue",       desc: "Job #142 enqueued · workers notified",   color: "#fbbf24" },
  wk:  { label: "Worker Executing",  desc: "Subprocess spawned · logs streaming",    color: "#34d399" },
  tm:  { label: "Terminal Output",   desc: "Streaming stdout via pub/sub",           color: "#22d3ee" },
};

export function PipelineScene() {
  const sectionRef = useRef(null);
  const flowRef = useRef(null);

  const githubRef  = useRef(null);
  const fastapiRef = useRef(null);
  const redisRef   = useRef(null);
  const workerRef  = useRef(null);
  const terminalRef = useRef(null);
  const packetRef  = useRef(null);

  const stackRef0 = useRef(null);
  const stackRef1 = useRef(null);
  const stackRef2 = useRef(null);
  const stackRef3 = useRef(null);
  const stackRef4 = useRef(null);
  const stackRefs = useMemo(() => [stackRef0, stackRef1, stackRef2, stackRef3, stackRef4], []);

  const refs = useMemo(() => ({
    github:   githubRef,
    fastapi:  fastapiRef,
    redis:    redisRef,
    worker:   workerRef,
    terminal: terminalRef,
  }), []);

  const [currentStep, setCurrentStep] = useState("gh");
  const [workerBurst, setWorkerBurst] = useState(false);
  const [terminalActive, setTerminalActive] = useState(false);

  const onStep = useCallback((s) => setCurrentStep(s), []);
  const onWorkerBurst = useCallback((v) => setWorkerBurst(v), []);
  const onTerminalActive = useCallback((v) => setTerminalActive(v), []);

  usePipelineTimeline({
    sectionRef,
    flowRef,
    refs,
    packetRef,
    stackRefs,
    onStep,
    onWorkerBurst,
    onTerminalActive,
  });

  const meta = STEP_META[currentStep] || STEP_META.gh;

  return (
    <section
      ref={sectionRef}
      id="pipeline"
      className="relative bg-transparent border-t"
      style={{ borderColor: "rgba(255,255,255,0.04)" }}
    >
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-fine-grid opacity-60" />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(139,92,246,0.07), transparent)" }}
        />
      </div>

      <div className="relative z-10 flex flex-col" style={{ minHeight: "100vh" }}>
        {/* Header */}
        <div className="pt-20 pb-12 px-4 text-center flex-shrink-0">
          <motion.p
            className="text-xs font-mono font-semibold uppercase tracking-[0.25em] mb-3"
            style={{ color: "#a78bfa" }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Live pipeline
          </motion.p>
          <motion.h2
            className="text-3xl sm:text-5xl font-extrabold tracking-tight text-gradient-white"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Webhook → terminal in one scroll.
          </motion.h2>
        </div>

        {/* Active step indicator */}
        <div className="flex justify-center mb-8 px-4 flex-shrink-0">
          <motion.div
            className="glass-card rounded-xl px-5 py-3 flex items-center gap-3"
            style={{ border: `1px solid ${meta.color}25` }}
            key={currentStep}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }}
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            <div>
              <p className="text-sm font-semibold text-zinc-100">{meta.label}</p>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">{meta.desc}</p>
            </div>
          </motion.div>
        </div>

        {/* Pipeline nodes + data packet container */}
        <div
          ref={flowRef}
          className="relative flex-1 mx-auto w-full max-w-6xl px-4 pb-12"
          style={{ minHeight: 400 }}
        >
          {/* Queue stack dots (GSAP-controlled) */}
          <QueueStack stackRefs={stackRefs} />

          {/* Traveling data packet (GSAP-controlled) */}
          <DataPacket ref={packetRef} />

          {/* Pipeline nodes row */}
          <div className="relative z-10 h-full flex flex-col gap-8">
            {/* Top row: GitHub → FastAPI → Redis → Worker */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 items-start pt-6">
              <PipelineNode
                ref={githubRef}
                icon={IconGitHub}
                label="GitHub"
                sub="Webhook event"
                accent="violet"
                active={currentStep === "gh"}
                step="01"
                statusText="push · main"
              />
              <PipelineNode
                ref={fastapiRef}
                icon={IconServer}
                label="FastAPI"
                sub="Control plane"
                accent="blue"
                active={currentStep === "api"}
                step="02"
                statusText="200 OK · 12ms"
              />
              <PipelineNode
                ref={redisRef}
                icon={IconDatabase}
                label="Redis"
                sub="Queue + pub/sub"
                accent="amber"
                active={currentStep === "rq"}
                step="03"
                statusText="Queued #142"
              />
              <PipelineNode
                ref={workerRef}
                icon={IconCpu}
                label="Worker"
                sub="Subprocess"
                accent="emerald"
                active={currentStep === "wk"}
                burst={workerBurst}
                step="04"
                statusText="Executing..."
              />
            </div>

            {/* Bottom row: Queue panel + Terminal */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Queue panel */}
              <div>
                <div className="flex items-center gap-2 mb-3 text-xs font-mono uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.2)" }}>
                  <IconDatabase className="w-3.5 h-3.5 text-amber-400" />
                  Queue state
                </div>
                <QueuePanel active={currentStep === "rq" || currentStep === "wk" || currentStep === "tm"} />
              </div>

              {/* Terminal */}
              <div ref={terminalRef}>
                <div className="flex items-center gap-2 mb-3 text-xs font-mono uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.2)" }}>
                  <IconTerminal className="w-3.5 h-3.5 text-cyan-400" />
                  Live logs
                  {terminalActive && (
                    <motion.span
                      className="ml-auto text-red-400"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      ● LIVE
                    </motion.span>
                  )}
                </div>
                <LiveTerminal active={terminalActive} />
              </div>
            </div>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-3 pb-8 flex-shrink-0">
          {Object.entries(STEP_META).map(([key, m]) => (
            <motion.div
              key={key}
              className="w-2 h-2 rounded-full"
              style={{
                background: currentStep === key ? m.color : "rgba(255,255,255,0.1)",
                boxShadow: currentStep === key ? `0 0 8px ${m.color}` : "none",
              }}
              animate={currentStep === key ? { scale: [1, 1.4, 1] } : { scale: 1 }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────── */
/* SCENE 3: PARALLEL BUILDS                                  */
/* ────────────────────────────────────────────────────────── */

export function ParallelScene() {
  return (
    <section
      className="relative min-h-screen flex flex-col justify-center py-24 px-4 border-t overflow-hidden bg-transparent"
      style={{ borderColor: "rgba(255,255,255,0.04)" }}
    >
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(52,211,153,0.06), transparent)" }}
        />
        <div className="absolute inset-0 bg-dot-grid opacity-30" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto w-full">
        {/* Section label */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xs font-mono font-semibold uppercase tracking-[0.25em] mb-3 text-emerald-400">
            Scene 03 · Parallel
          </p>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-gradient-white mb-4">
            Run builds in parallel. No waiting.
          </h2>
          <p className="text-zinc-400 max-w-lg mx-auto text-base">
            Multiple workers execute simultaneously across regions. Each job gets its own isolated environment.
          </p>
        </motion.div>

        {/* Cards animate themselves via whileInView — no parent active gate */}
        <ParallelBuildsScene />
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────── */
/* SCENE 4: METRICS                                          */
/* ────────────────────────────────────────────────────────── */

export function MetricsSceneSection() {
  return (
    <section
      className="relative min-h-screen flex flex-col justify-center py-24 px-4 border-t overflow-hidden"
      style={{ background: "transparent", borderColor: "rgba(255,255,255,0.04)" }}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-fine-grid opacity-40" />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 70% 40% at 50% 50%, rgba(59,130,246,0.06), transparent)" }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto w-full">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xs font-mono font-semibold uppercase tracking-[0.25em] mb-3 text-blue-400">
            Scene 04 · Performance
          </p>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-gradient-white mb-4">
            Every number, live.
          </h2>
          <p className="text-zinc-400 max-w-lg mx-auto text-base">
            Observable by design. Queue depth, worker health, and log throughput — always visible, never a black box.
          </p>
        </motion.div>

        {/* Pass active=true always — each metric card uses its own whileInView */}
        <MetricsScene active={true} />
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────── */
/* SCENE 5: FINAL CTA                                        */
/* ────────────────────────────────────────────────────────── */

export function CtaScene() {
  const [hovered, setHovered] = useState(false);

  return (
    <section
      className="relative min-h-screen flex items-center justify-center py-24 px-4 border-t overflow-hidden"
      style={{ background: "transparent", borderColor: "rgba(255,255,255,0.04)" }}
    >
      {/* Glow orb */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ background: "radial-gradient(circle, rgba(52,211,153,0.15) 0%, transparent 70%)", filter: "blur(40px)" }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-dot-grid opacity-20" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <motion.p
          className="text-xs font-mono font-semibold uppercase tracking-[0.25em] mb-6 text-emerald-400"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Scene 05 · Deploy
        </motion.p>

        <motion.h2
          className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="text-gradient-white">Ready when</span>
          <br />
          <span className="text-gradient-green">your repo is.</span>
        </motion.h2>

        <motion.p
          className="text-zinc-400 text-base sm:text-lg max-w-xl mx-auto mb-12"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.6 }}
        >
          Push one commit. Watch the whole pipeline execute in realtime.<br />
          No YAML hell. No black boxes.
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <motion.button
            type="button"
            className="relative inline-flex items-center gap-2.5 rounded-full text-sm font-bold text-zinc-950 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #34d399 0%, #22d3ee 50%, #34d399 100%)",
              backgroundSize: "200% 100%",
              padding: "14px 36px",
              boxShadow: hovered
                ? "0 0 40px rgba(52,211,153,0.6), 0 0 80px rgba(52,211,153,0.2)"
                : "0 0 24px rgba(52,211,153,0.3)",
            }}
            onHoverStart={() => setHovered(true)}
            onHoverEnd={() => setHovered(false)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 24 }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Connect your repo
            <motion.span
              animate={{ x: hovered ? 4 : 0 }}
              transition={{ duration: 0.2 }}
            >
              →
            </motion.span>
          </motion.button>

          <motion.button
            type="button"
            className="inline-flex items-center gap-2 rounded-full text-sm font-semibold text-zinc-300"
            style={{
              padding: "14px 28px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            whileHover={{ scale: 1.03, background: "rgba(255,255,255,0.08)" }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 24 }}
          >
            Read the docs
          </motion.button>
        </motion.div>

        {/* Social proof */}
        <motion.div
          className="mt-16 flex items-center justify-center gap-8 text-xs text-zinc-600 font-mono"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <span>847 builds/sec</span>
          <span className="text-zinc-800">·</span>
          <span>32 workers</span>
          <span className="text-zinc-800">·</span>
          <span className="text-emerald-600">99.7% uptime</span>
        </motion.div>
      </div>
    </section>
  );
}
