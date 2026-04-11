import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FlowLine } from "../primitives/FlowLine.jsx";
import { DataPacket } from "../primitives/DataPacket.jsx";
import { PipelineNode } from "../primitives/PipelineNode.jsx";
import { QueueStack } from "../primitives/QueueStack.jsx";
import { WorkerNode } from "../primitives/WorkerNode.jsx";
import { LiveTerminal } from "../primitives/LiveTerminal.jsx";
import {
  IconCpu,
  IconDatabase,
  IconGitHub,
  IconServer,
} from "../../components/icons/PipelineIcons.jsx";
import {
  usePipelineScroll,
  smoothPath,
  center,
} from "../../hooks/usePipelineScroll.js";
import { easeSoft } from "../../lib/easing.js";

export function ScenePipeline() {
  const pinRef = useRef(null);
  const diagramRef = useRef(null);
  const packetRef = useRef(null);
  const waveRef = useRef(null);
  const terminalRef = useRef(null);

  const gitRef = useRef(null);
  const apiRef = useRef(null);
  const redisRef = useRef(null);
  const workerRef = useRef(null);
  const termAnchorRef = useRef(null);

  const [pathD, setPathD] = useState("");
  const [phase, setPhase] = useState("gh");
  const [queueHot, setQueueHot] = useState(false);
  const [workerBurst, setWorkerBurst] = useState(false);

  const setPhaseCb = useCallback((p) => setPhase(p), []);
  const setQueueHotCb = useCallback((v) => setQueueHot(v), []);
  const setWorkerBurstCb = useCallback((v) => setWorkerBurst(v), []);

  const measure = useCallback(() => {
    const root = diagramRef.current;
    if (!root) return;
    const pts = [
      center(gitRef.current, root),
      center(apiRef.current, root),
      center(redisRef.current, root),
      center(workerRef.current, root),
      center(termAnchorRef.current, root),
    ];
    setPathD(smoothPath(pts));
  }, []);

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(measure);
    });
    const ro = new ResizeObserver(() => measure());
    if (diagramRef.current) ro.observe(diagramRef.current);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(id);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  usePipelineScroll({
    pinRef,
    diagramRef,
    pathD,
    packetRef,
    waveRef,
    terminalRef,
    setPhase: setPhaseCb,
    setQueueHot: setQueueHotCb,
    setWorkerBurst: setWorkerBurstCb,
  });

  const labels = {
    gh: phase === "api" ? "Webhook fired" : "",
    api: phase === "api" || phase === "redis" ? "Webhook received" : "",
    redis: phase === "redis" || phase === "worker" ? "Queued job #142" : "",
    wk: phase === "worker" || phase === "term" ? "Executing…" : "",
  };

  return (
    <div className="relative w-full border-y border-emerald-500/10 bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(52,211,153,0.08),transparent)]" />

      <div
        ref={pinRef}
        className="relative flex min-h-[100dvh] w-full flex-col gap-2 p-2 pb-6 pt-14 lg:gap-3 lg:p-3 lg:pt-16"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.45, ease: easeSoft }}
          className="flex shrink-0 flex-col gap-0.5 px-1 lg:px-2"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-400/90">
            Live pipeline
          </p>
          <h2 className="text-base font-bold tracking-tight text-zinc-100 sm:text-lg">
            Every hop traced · scroll to drive
          </h2>
        </motion.div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row lg:gap-3">
          <div
            ref={diagramRef}
            className="relative min-h-[360px] flex-1 overflow-visible rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/50 to-zinc-950/80 p-2 shadow-inner ring-1 ring-white/5 sm:min-h-[400px] sm:p-3"
          >
            <FlowLine pathD={pathD} />
            <DataPacket ref={packetRef} />

            <div className="relative z-10 mx-auto h-[360px] w-full max-w-3xl sm:h-[400px]">
              <div className="absolute left-[4%] top-[52%] w-[128px] sm:left-[6%]">
                <div className="relative flex justify-center">
                  <span
                    ref={waveRef}
                    className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-400/35 bg-violet-500/15 will-change-transform"
                  />
                  <div className="relative z-10 w-full">
                    <PipelineNode
                      ref={gitRef}
                      icon={IconGitHub}
                      title="GitHub"
                      subtitle="push event"
                      tone="violet"
                      active={phase === "gh" || phase === "api"}
                      label={labels.gh}
                    />
                  </div>
                </div>
              </div>

              <div className="absolute left-[22%] top-[22%] w-[132px] sm:left-[24%]">
                <PipelineNode
                  ref={apiRef}
                  icon={IconServer}
                  title="FastAPI"
                  subtitle="ingress"
                  tone="blue"
                  badge="POST /hook"
                  active={phase === "api" || phase === "redis"}
                  label={labels.api}
                />
              </div>

              <div className="absolute left-[42%] top-[50%] flex w-[168px] flex-col gap-2 sm:left-[44%]">
                <PipelineNode
                  ref={redisRef}
                  icon={IconDatabase}
                  title="Redis"
                  subtitle="queue + pub/sub"
                  tone="amber"
                  active={phase === "redis" || phase === "worker"}
                  label={labels.redis}
                />
                <QueueStack highlight={queueHot} />
              </div>

              <div className="absolute right-[8%] top-[26%] w-[132px] sm:right-[10%]">
                <WorkerNode
                  ref={workerRef}
                  icon={IconCpu}
                  title="Worker"
                  subtitle="subprocess"
                  active={phase === "worker" || phase === "term"}
                  explode={workerBurst}
                  label={labels.wk}
                />
              </div>

              <div
                ref={termAnchorRef}
                className="absolute right-[3%] top-[6%] h-1 w-1 opacity-0"
                aria-hidden
              />
            </div>
          </div>

          <div className="flex w-full min-w-0 flex-col lg:w-[min(42vw,440px)] lg:shrink-0">
            <div className="mb-1 flex items-center justify-between px-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                Live terminal
              </span>
              <span className="font-mono text-[10px] text-emerald-500/80">stdout</span>
            </div>
            <div className="min-h-[280px] flex-1 lg:min-h-0">
              <LiveTerminal ref={terminalRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
