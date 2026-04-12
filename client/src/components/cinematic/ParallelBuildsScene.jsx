import { useEffect, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";

const WORKER_CONFIGS = [
  {
    id: "worker-01",
    region: "us-east-1",
    job: "feat/deploy-pipeline",
    color: "#34d399",
    startDelay: 0,
  },
  {
    id: "worker-02",
    region: "eu-west-2",
    job: "fix/redis-timeout",
    color: "#60a5fa",
    startDelay: 600,
  },
  {
    id: "worker-03",
    region: "ap-south-1",
    job: "chore/update-deps",
    color: "#a78bfa",
    startDelay: 1200,
  },
];

/* ──────────────────────────────────────
   Mini terminal — starts when active flips true
   ──────────────────────────────────────*/
function MiniTerminal({ active, color, region, jobName }) {
  const [lines, setLines] = useState([]);
  const cancelRef = useRef(false);

  // Each re-activation (active: false→true) replays from scratch
  useEffect(() => {
    cancelRef.current = true; // stop any in-flight loop

    if (!active) {
      setLines([]);
      return;
    }

    const LOGS = [
      `[${region}] initialising worker...`,
      `$ git clone ${jobName}`,
      `$ pip install -r requirements.txt`,
      `$ pytest tests/ --tb=short`,
      `✓ 42 passed in 3.1s`,
      `$ docker build -t app:latest .`,
      `✓ Build complete · 47s`,
    ];

    cancelRef.current = false;
    let i = 0;
    let timerId;

    const tick = () => {
      if (cancelRef.current) return;
      if (i >= LOGS.length) return;
      const entry = LOGS[i]; // capture before increment (React 18 updater is async)
      i++;
      setLines((prev) => [...prev, entry]);
      timerId = setTimeout(tick, 280 + Math.random() * 160);
    };

    timerId = setTimeout(tick, 200);
    return () => {
      cancelRef.current = true;
      clearTimeout(timerId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const LOGS_LEN = 7; // keep in sync with LOGS array above

  return (
    <div
      className="rounded-lg overflow-hidden flex flex-col h-full"
      style={{
        background: "#060608",
        border: `1px solid ${active ? `${color}28` : "rgba(255,255,255,0.04)"}`,
        transition: "border-color 0.4s ease",
      }}
    >
      {/* Title bar */}
      <div
        className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
        style={{
          background: "#0a0a0d",
          borderBottom: `1px solid rgba(255,255,255,0.04)`,
        }}
      >
        <div className="flex gap-1">
          {[active ? "#28c840" : "#3f3f46", "#3f3f46", "#3f3f46"].map(
            (bg, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{ background: bg }}
              />
            )
          )}
        </div>
        <span className="font-mono text-[10px]" style={{ color: `${color}70` }}>
          {region}
        </span>
        {active && (
          <motion.div
            className="ml-auto w-1.5 h-1.5 rounded-full"
            style={{ background: color, boxShadow: `0 0 6px ${color}` }}
            animate={{ opacity: [1, 0.25, 1] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>

      {/* Log stream */}
      <div
        className="flex-1 px-3 py-2 font-mono text-[10px] overflow-hidden"
        style={{ lineHeight: "18px" }}
      >
        {!active && lines.length === 0 && (
          <span style={{ color: "rgba(255,255,255,0.12)" }}>
            waiting for job...
          </span>
        )}

        <AnimatePresence initial={false}>
          {lines.slice(-6).map((line, i) => (
            <motion.div
              key={`${i}-${line}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              style={{
                color: line.startsWith("✓") ? color : "rgba(255,255,255,0.35)",
              }}
            >
              {line}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Blinking cursor while running */}
        {active && lines.length < LOGS_LEN && (
          <motion.span
            className="inline-block w-[6px] h-[13px] translate-y-[2px]"
            style={{ background: color }}
            animate={{ opacity: [1, 1, 0, 0] }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "linear",
              times: [0, 0.45, 0.5, 1],
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   Circular spinner shown before job starts
   ──────────────────────────────────────*/
function SpinnerRing({ color, size = 20 }) {
  const c = size / 2;
  const r = size / 2 - 2;
  const dash = Math.PI * (size - 4);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ flexShrink: 0 }}
    >
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={`${color}20`}
        strokeWidth="2"
      />
      <motion.g
        style={{ transformOrigin: `${c}px ${c}px` }}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
      >
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={dash}
          strokeDashoffset={dash * 0.75}
          style={{ filter: `drop-shadow(0 0 3px ${color})` }}
        />
      </motion.g>
    </svg>
  );
}

/* ──────────────────────────────────────
   Worker card — triggers on viewport entry
   ──────────────────────────────────────*/
function WorkerCard({ config, index }) {
  const cardRef = useRef(null);
  // Fire once when 30% of the card is visible
  const isInView = useInView(cardRef, { once: true, amount: 0.3 });

  const [started, setStarted] = useState(false); // whether the job has kicked off
  const [progress, setProgress] = useState(0);
  const cancelledRef = useRef(false);
  const progressTimerRef = useRef(null);

  // When section enters view, stagger-start each worker
  useEffect(() => {
    if (!isInView || started) return;

    const outerTimer = setTimeout(() => {
      cancelledRef.current = false;

      let p = 0;

      const tick = () => {
        if (cancelledRef.current) return;
        p += Math.random() * 6 + 3;
        if (p >= 100) {
          setProgress(100);
          return;
        }
        setProgress(Math.round(p));
        progressTimerRef.current = setTimeout(
          tick,
          150 + Math.random() * 80
        );
      };

      progressTimerRef.current = setTimeout(tick, 80);
    }, config.startDelay);

    return () => {
      clearTimeout(outerTimer);
      clearTimeout(progressTimerRef.current);
      cancelledRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInView]);

  const done = progress >= 100;

  return (
    <motion.div
      ref={cardRef}
      className="glass-card rounded-xl overflow-hidden flex flex-col"
      style={{
        border: `1px solid ${
          started ? `${config.color}22` : "rgba(255,255,255,0.05)"
        }`,
        boxShadow: started
          ? `0 0 0 1px ${config.color}14, 0 8px 32px rgba(0,0,0,0.5)`
          : "0 4px 20px rgba(0,0,0,0.4)",
        transition: "border-color 0.5s ease, box-shadow 0.5s ease",
      }}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        delay: index * 0.12,
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          borderColor: "rgba(255,255,255,0.05)",
          background: "rgba(0,0,0,0.35)",
        }}
      >
        <div className="flex items-center gap-2.5">
          {/* CPU icon */}
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: `${config.color}12`,
              border: `1px solid ${config.color}25`,
              transition: "background 0.4s, border-color 0.4s",
            }}
          >
            {!started ? (
              // waiting: dim static icon
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke={`${config.color}50`}
                strokeWidth="1.75"
              >
                <rect x="7" y="7" width="10" height="10" rx="1.5" />
                <path d="M12 3v2M12 19v2M3 12h2M19 12h2" />
              </svg>
            ) : done ? (
              // done: green check
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill={config.color}>
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              // running: spinner
              <SpinnerRing color={config.color} size={18} />
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-zinc-200 font-mono">
              {config.id}
            </p>
            <p className="text-[10px]" style={{ color: `${config.color}70` }}>
              {config.region}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <AnimatePresence mode="wait">
          {!started ? (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-mono"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.25)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
              idle
            </motion.div>
          ) : done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-mono font-medium"
              style={{
                background: "rgba(52,211,153,0.12)",
                color: "#34d399",
                border: "1px solid rgba(52,211,153,0.25)",
              }}
            >
              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              done
            </motion.div>
          ) : (
            <motion.div
              key="running"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-mono font-medium"
              style={{
                background: `${config.color}12`,
                color: config.color,
                border: `1px solid ${config.color}25`,
              }}
            >
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: config.color,
                  boxShadow: `0 0 5px ${config.color}`,
                }}
                animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
                transition={{
                  duration: 0.9,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              running
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Job + progress ── */}
      <div className="px-4 py-3 flex flex-col gap-2.5">
        {/* Branch name */}
        <div className="flex items-center gap-2 text-xs">
          <svg
            className="w-3 h-3 text-zinc-600 flex-shrink-0"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          <span
            className="font-mono truncate"
            style={{
              color: started
                ? "rgba(255,255,255,0.5)"
                : "rgba(255,255,255,0.2)",
            }}
          >
            {config.job}
          </span>
        </div>

        {/* Progress bar container */}
        <div>
          {/* Track */}
          <div
            className="w-full h-[5px] rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            {/* Fill — scaleX is a compositor-only transform: 60fps guaranteed */}
            <motion.div
              className="h-full rounded-full origin-left"
              style={{
                background: done
                  ? "linear-gradient(90deg, #34d399, #22d3ee)"
                  : `linear-gradient(90deg, ${config.color}, ${config.color}99)`,
                boxShadow: started ? `0 0 8px ${config.color}80` : "none",
              }}
              animate={{ scaleX: progress / 100 }}
              transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          </div>

          {/* Percentage label */}
          <div className="flex items-center justify-between mt-1.5">
            <span
              className="font-mono text-[10px]"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              {done ? "✓ complete" : started ? `${progress}%` : "waiting..."}
            </span>
            {started && !done && (
              <motion.span
                className="font-mono text-[10px]"
                style={{ color: `${config.color}80` }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                in progress
              </motion.span>
            )}
            {done && (
              <span
                className="font-mono text-[10px]"
                style={{ color: "#34d39980" }}
              >
                47s
              </span>
            )}
          </div>
        </div>

        {/* Step indicators — mini pipeline steps */}
        <div className="flex items-center gap-1.5">
          {["clone", "install", "test", "build"].map((step, si) => {
            const stepThreshold = [15, 35, 65, 90][si];
            const reached = progress >= stepThreshold;
            return (
              <div key={step} className="flex items-center gap-1.5 flex-1">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{
                    background: reached
                      ? config.color
                      : "rgba(255,255,255,0.1)",
                  }}
                  animate={
                    started && !reached && progress >= stepThreshold - 10
                      ? { scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }
                      : {}
                  }
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
                {si < 3 && (
                  <div
                    className="flex-1 h-px"
                    style={{
                      background: reached
                        ? `${config.color}40`
                        : "rgba(255,255,255,0.06)",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div
          className="flex justify-between text-[9px] font-mono"
          style={{ color: "rgba(255,255,255,0.15)" }}
        >
          <span>clone</span>
          <span>install</span>
          <span>test</span>
          <span>build</span>
        </div>
      </div>

      {/* ── Mini terminal ── */}
      <div className="h-[110px] mx-3 mb-3">
        <MiniTerminal
          active={started}
          color={config.color}
          jobName={config.job}
          region={config.region}
        />
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────
   Scene root
   ──────────────────────────────────────*/
export function ParallelBuildsScene() {
  return (
    <div className="w-full">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-zinc-100">
            Parallel Execution
          </h3>
          <p className="text-sm text-zinc-500 mt-0.5 font-mono">
            3 workers · 3 jobs · no waiting
          </p>
        </div>
        <motion.div
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            background: "rgba(52,211,153,0.08)",
            border: "1px solid rgba(52,211,153,0.2)",
          }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-emerald-400"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            style={{ boxShadow: "0 0 6px #34d399" }}
          />
          <span className="text-emerald-400 text-xs font-mono">
            All workers active
          </span>
        </motion.div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {WORKER_CONFIGS.map((config, i) => (
          <WorkerCard key={config.id} config={config} index={i} />
        ))}
      </div>
    </div>
  );
}
