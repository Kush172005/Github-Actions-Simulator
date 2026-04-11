import { useMemo, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { AnimatedNode } from "./AnimatedNode.jsx";
import { Terminal } from "./Terminal.jsx";
import { DataPacket, QueueStack } from "./DataFlow.jsx";
import { useArchitectureTimeline } from "../../hooks/useArchitectureTimeline.js";
import {
  IconCpu,
  IconDatabase,
  IconGitHub,
  IconServer,
  IconTerminal,
} from "../icons/PipelineIcons.jsx";
import { easeSoft } from "../../lib/easing.js";

export function ArchitectureSection() {
  const sectionRef = useRef(null);
  const flowRef = useRef(null);

  const githubRef = useRef(null);
  const fastapiRef = useRef(null);
  const redisRef = useRef(null);
  const workerRef = useRef(null);
  const terminalRef = useRef(null);
  const packetRef = useRef(null);

  const stackRef1 = useRef(null);
  const stackRef2 = useRef(null);
  const stackRef3 = useRef(null);

  const pipelineRefs = useMemo(
    () => ({
      github: githubRef,
      fastapi: fastapiRef,
      redis: redisRef,
      worker: workerRef,
      terminal: terminalRef,
    }),
    [],
  );

  const stackRefs = useMemo(
    () => [stackRef1, stackRef2, stackRef3],
    [],
  );

  const [highlight, setHighlight] = useState("gh");
  const [workerBurst, setWorkerBurst] = useState(false);
  const [terminalActive, setTerminalActive] = useState(false);

  const onHighlight = useCallback((k) => setHighlight(k), []);
  const onBurst = useCallback((v) => setWorkerBurst(v), []);
  const onTerminal = useCallback((v) => setTerminalActive(v), []);

  useArchitectureTimeline({
    sectionRef,
    flowRef,
    refs: pipelineRefs,
    packetRef,
    stackRefs,
    setHighlight: onHighlight,
    setWorkerBurst: onBurst,
    setTerminalActive: onTerminal,
  });

  return (
    <section
      id="architecture"
      ref={sectionRef}
      className="relative border-t border-zinc-800/80 bg-zinc-950"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.12),transparent)]" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-20 pb-8 text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.5, ease: easeSoft }}
          className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-violet-400"
        >
          Live architecture
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55, ease: easeSoft }}
          className="text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl md:text-5xl"
        >
          From webhook to logs — one scroll.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ delay: 0.08, duration: 0.5, ease: easeSoft }}
          className="mx-auto mt-4 max-w-2xl text-sm text-zinc-400 sm:text-base"
        >
          GitHub fires the hook. FastAPI validates. Redis queues fairly. Workers execute natively.
          Pub/sub streams every byte back to your terminal.
        </motion.p>
      </div>

      <div
        ref={flowRef}
        className="relative z-10 mx-auto min-h-[560px] w-full max-w-6xl px-4 pb-24"
      >
        <QueueStack stackRefs={stackRefs} />
        <DataPacket ref={packetRef} />

        <div className="relative z-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-6 lg:items-start lg:gap-5">
          <div className="flex justify-center lg:col-span-1">
            <AnimatedNode
              ref={githubRef}
              icon={IconGitHub}
              label="GitHub"
              sub="Webhook"
              accent="violet"
              active={highlight === "gh"}
            />
          </div>
          <div className="flex justify-center lg:col-span-1">
            <AnimatedNode
              ref={fastapiRef}
              icon={IconServer}
              label="FastAPI"
              sub="Control plane"
              accent="blue"
              active={highlight === "api"}
            />
          </div>
          <div className="flex justify-center lg:col-span-1">
            <AnimatedNode
              ref={redisRef}
              icon={IconDatabase}
              label="Redis"
              sub="Queue + pub/sub"
              accent="amber"
              active={highlight === "rq"}
            />
          </div>
          <div className="flex justify-center lg:col-span-1">
            <AnimatedNode
              ref={workerRef}
              icon={IconCpu}
              label="Worker"
              sub="Subprocess"
              accent="emerald"
              active={highlight === "wk"}
              burst={workerBurst}
            />
          </div>
          <div className="flex justify-center sm:col-span-2 lg:col-span-2">
            <div className="flex w-full max-w-md flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                <IconTerminal className="h-4 w-4 text-cyan-400" />
                Live logs
              </div>
              <Terminal ref={terminalRef} active={terminalActive} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
