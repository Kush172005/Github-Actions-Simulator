import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LOG_STREAMS = [
  { text: "$ git clone https://github.com/acme/service.git", color: "#67e8f9", delay: 0 },
  { text: "Cloning into 'service'...", color: "#a1a1aa", delay: 60 },
  { text: "remote: Counting objects: 847, done.", color: "#a1a1aa", delay: 40 },
  { text: "Resolving deltas: 100% (423/423), done.", color: "#a1a1aa", delay: 60 },
  { text: "$ cd service && pip install -r requirements.txt", color: "#67e8f9", delay: 100 },
  { text: "Collecting fastapi==0.110.0", color: "#a1a1aa", delay: 25 },
  { text: "Collecting uvicorn==0.28.1", color: "#a1a1aa", delay: 20 },
  { text: "Collecting redis==5.0.3", color: "#a1a1aa", delay: 20 },
  { text: "Installing collected packages: fastapi, uvicorn, redis", color: "#a1a1aa", delay: 30 },
  { text: "Successfully installed 18 packages", color: "#34d399", delay: 50 },
  { text: "$ python -m pytest tests/ -v --tb=short", color: "#67e8f9", delay: 80 },
  { text: "collected 42 items", color: "#a1a1aa", delay: 40 },
  { text: "tests/test_webhook.py::test_receive PASSED      [  2%]", color: "#34d399", delay: 30 },
  { text: "tests/test_queue.py::test_enqueue PASSED        [  7%]", color: "#34d399", delay: 25 },
  { text: "tests/test_worker.py::test_execute PASSED       [ 12%]", color: "#34d399", delay: 30 },
  { text: "tests/test_deploy.py::test_async PASSED         [ 17%]", color: "#34d399", delay: 25 },
  { text: "tests/test_pipeline.py::test_e2e PASSED         [ 33%]", color: "#34d399", delay: 40 },
  { text: "====== 42 passed in 3.14s ======", color: "#34d399", delay: 60 },
  { text: "$ docker build -t acme/service:latest .", color: "#67e8f9", delay: 80 },
  { text: "STEP 1/8 : FROM python:3.11-slim", color: "#a1a1aa", delay: 30 },
  { text: "STEP 4/8 : COPY requirements.txt .", color: "#a1a1aa", delay: 25 },
  { text: "STEP 8/8 : CMD [\"uvicorn\", \"main:app\"]", color: "#a1a1aa", delay: 25 },
  { text: "Successfully built f3a2b8c9d1e4", color: "#34d399", delay: 50 },
  { text: "✓ Build complete in 47s · Image: 142MB", color: "#34d399", delay: 30 },
  { text: "→ Streaming logs via Redis pub/sub...", color: "#818cf8", delay: 60 },
];

export const LiveTerminal = forwardRef(function LiveTerminal({ active = false, compact = false }, ref) {
  const [lines, setLines] = useState([]);
  const [done, setDone] = useState(false);
  const scrollRef = useRef(null);
  const cancelRef = useRef(false);
  const hasRun = useRef(false);

  useImperativeHandle(ref, () => ({
    reset() {
      cancelRef.current = true;
      setLines([]);
      setDone(false);
      hasRun.current = false;
      setTimeout(() => { cancelRef.current = false; }, 50);
    }
  }));

  useEffect(() => {
    if (!active || hasRun.current) return;
    hasRun.current = true;
    cancelRef.current = false;

    (async () => {
      for (let i = 0; i < LOG_STREAMS.length; i++) {
        if (cancelRef.current) return;
        const entry = LOG_STREAMS[i];
        await new Promise((r) => setTimeout(r, entry.delay + Math.random() * 20));
        if (cancelRef.current) return;
        setLines((prev) => [...prev, entry]);
      }
      if (!cancelRef.current) setDone(true);
    })();

    return () => { cancelRef.current = true; };
  }, [active]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const maxH = compact ? "max-h-[180px]" : "max-h-[280px]";

  return (
    <div className="terminal-chrome w-full h-full flex flex-col">
      {/* Chrome bar */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-b flex-shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0a0a0d" }}
      >
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-400/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
        </div>
        <div className="flex-1 flex justify-center items-center gap-2">
          <span className="font-mono text-[11px] text-zinc-500">worker@shipstack</span>
          <span className="text-zinc-700 font-mono text-[10px]">~/workspace</span>
        </div>
        {/* Live indicator */}
        <div className="flex items-center gap-1.5">
          {active && (
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-red-500"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
          <span className="text-[10px] font-mono" style={{ color: active ? "#f87171" : "#3f3f46" }}>
            {active ? "LIVE" : "IDLE"}
          </span>
        </div>
      </div>

      {/* Log output */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto px-4 py-3 font-mono text-[12px] leading-[20px] ${maxH} space-y-0`}
        style={{ background: "#060608" }}
      >
        {/* Prompt waiting state */}
        {!active && lines.length === 0 && (
          <div className="flex items-center gap-2 opacity-30">
            <span className="text-emerald-400">worker@shipstack</span>
            <span className="text-zinc-500">:~$</span>
            <span className="inline-block w-[7px] h-[13px] cursor-blink" style={{ background: "#34d399", opacity: 0.8 }} />
          </div>
        )}

        <AnimatePresence initial={false}>
          {lines.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.12 }}
              className="leading-[20px]"
              style={{ color: line.color }}
            >
              {line.text}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Active cursor */}
        {active && !done && (
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-emerald-400 text-[11px]">worker@shipstack:~$</span>
            <span
              className="inline-block w-[7px] h-[13px] cursor-blink"
              style={{ background: "#34d399", opacity: 0.9, marginTop: 2 }}
            />
          </div>
        )}

        {/* Done state */}
        {done && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 flex items-center gap-2"
          >
            <span className="text-emerald-400 text-[11px]">✓ Pipeline complete</span>
            <span
              className="inline-block w-[7px] h-[13px]"
              style={{ background: "#34d399", opacity: 0.5 }}
            />
          </motion.div>
        )}
      </div>

      {/* Status bar */}
      <div
        className="flex items-center justify-between px-4 py-1.5 flex-shrink-0 font-mono text-[10px]"
        style={{ background: "#050507", borderTop: "1px solid rgba(255,255,255,0.04)" }}
      >
        <span style={{ color: "rgba(255,255,255,0.2)" }}>bash · zsh 5.9</span>
        <div className="flex items-center gap-3" style={{ color: "rgba(255,255,255,0.2)" }}>
          <span className="text-emerald-600">{lines.length}/{LOG_STREAMS.length} lines</span>
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  );
});
