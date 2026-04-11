import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

const CODE_LINES = [
  { text: "async def deploy_service(env: str):", color: "#dcdcaa" },
  { text: '    """Deploy to production cluster."""', color: "#6a9955" },
  { text: "    config = await load_config(env)", color: "#9cdcfe" },
  { text: "    async with aiohttp.ClientSession() as s:", color: "#c586c0" },
  { text: '        resp = await s.post("/deploy",', color: "#9cdcfe" },
  { text: "            json=config.dict(),", color: "#9cdcfe" },
  { text: '            headers={"X-Token": TOKEN})', color: "#ce9178" },
  { text: "    return await resp.json()", color: "#9cdcfe" },
];

const LINE_COLORS = {
  kw: "#c586c0",
  fn: "#dcdcaa",
  str: "#ce9178",
  comment: "#6a9955",
  var: "#9cdcfe",
  punct: "#d4d4d4",
  num: "#b5cea8",
};

// Syntax coloring map
function tokenize(text) {
  // Very simple — just return colored spans
  return text;
}

function EditorLine({ line, lineNum, revealed, isTyping, charCount }) {
  const displayText = isTyping ? line.text.slice(0, charCount) : (revealed ? line.text : "");
  const showCursor = isTyping;

  return (
    <div className="flex items-start gap-0 leading-6 min-h-[24px]">
      <span className="select-none w-8 text-right pr-3 text-zinc-600 text-xs font-mono flex-shrink-0" style={{ userSelect: "none" }}>
        {lineNum}
      </span>
      <span className="font-mono text-[13px] flex-1" style={{ color: line.color }}>
        {displayText}
        {showCursor && (
          <span
            className="inline-block w-[2px] h-[14px] ml-[1px] translate-y-[2px]"
            style={{ background: "#34d399", animation: "blink 0.8s step-end infinite" }}
          />
        )}
      </span>
    </div>
  );
}

export function CodeEditorMock({ onCommitReady, isActive }) {
  const [typedLines, setTypedLines] = useState([]); // [{text, charCount, done}]
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [done, setDone] = useState(false);
  const timerRef = useRef(null);
  const hasStarted = useRef(false);

  const typeNext = useCallback(() => {
    setCurrentChar((prev) => {
      const line = CODE_LINES[currentLine];
      if (!line) return prev;
      if (prev >= line.text.length) {
        // Move to next line
        setTypedLines((tl) => {
          const next = [...tl];
          next[currentLine] = line.text.length;
          return next;
        });
        setCurrentLine((l) => {
          const nl = l + 1;
          if (nl >= CODE_LINES.length) {
            // Mark done — onCommitReady fires via its own useEffect below
            setDone(true);
          }
          return nl;
        });
        return 0;
      }
      setTypedLines((tl) => {
        const next = [...tl];
        next[currentLine] = prev + 1;
        return next;
      });
      return prev + 1;
    });
  }, [currentLine]);

  // Fire onCommitReady once, outside of any render-phase updater
  useEffect(() => {
    if (done) onCommitReady?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  useEffect(() => {
    if (!isActive || hasStarted.current) return;
    hasStarted.current = true;
    // Initialize
    setTypedLines(new Array(CODE_LINES.length).fill(0));
    setCurrentLine(0);
    setCurrentChar(0);
    setDone(false);
  }, [isActive]);

  useEffect(() => {
    if (!isActive || done) return;
    if (!hasStarted.current) return;
    const delay = Math.random() * 10 + 12;
    timerRef.current = setTimeout(typeNext, delay);
    return () => clearTimeout(timerRef.current);
  }, [isActive, done, typeNext, currentChar, currentLine]);

  return (
    <div className="editor-chrome w-full h-full flex flex-col" style={{ minHeight: 280 }}>
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] flex-shrink-0" style={{ background: "#111113" }}>
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
        </div>
        <div className="flex-1 flex justify-center">
          <span className="text-xs text-zinc-500 font-mono">deploy.py — ShipStack</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-zinc-600 font-mono">main</span>
        </div>
      </div>

      {/* Sidebar + Editor split */}
      <div className="flex flex-1 min-h-0">
        {/* Activity bar */}
        <div className="w-10 flex-shrink-0 border-r border-white/[0.04] flex flex-col items-center gap-3 pt-3" style={{ background: "#0e0e11" }}>
          {["M", "⎇", "⚙", "🔍"].map((icon, i) => (
            <div key={i} className={`w-6 h-6 flex items-center justify-center rounded text-[11px] ${i === 0 ? "text-zinc-300" : "text-zinc-600"}`}>
              {icon}
            </div>
          ))}
        </div>

        {/* Code area */}
        <div className="flex-1 overflow-hidden relative" style={{ background: "#0d0d0f" }}>
          {/* Line numbers bg */}
          <div className="absolute left-0 top-0 bottom-0 w-10 bg-black/20" />

          <div className="relative p-4 space-y-0.5 overflow-hidden h-full">
            {/* File header comment */}
            <div className="flex items-start gap-0 leading-6 min-h-[24px] mb-1">
              <span className="select-none w-8 text-right pr-3 text-zinc-700 text-xs font-mono flex-shrink-0">1</span>
              <span className="font-mono text-[13px]" style={{ color: "#6a9955" }}># src/workers/deploy.py</span>
            </div>
            <div className="flex items-start gap-0 leading-6 min-h-[24px] mb-1">
              <span className="select-none w-8 text-right pr-3 text-zinc-700 text-xs font-mono flex-shrink-0">2</span>
              <span className="font-mono text-[13px]" style={{ color: "#c586c0" }}>import <span style={{ color: "#9cdcfe" }}>aiohttp</span>, <span style={{ color: "#9cdcfe" }}>asyncio</span></span>
            </div>
            <div className="h-3" />
            {CODE_LINES.map((line, i) => (
              <EditorLine
                key={i}
                line={line}
                lineNum={i + 4}
                revealed={typedLines[i] >= line.text.length}
                isTyping={currentLine === i && isActive}
                charCount={typedLines[i] || 0}
              />
            ))}

            {/* Active line highlight */}
            {isActive && currentLine < CODE_LINES.length && (
              <motion.div
                className="absolute left-0 right-0 pointer-events-none"
                style={{
                  top: `${(currentLine + 3) * 24 + 16 + 12 + 24}px`,
                  height: "24px",
                  background: "rgba(52, 211, 153, 0.04)",
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div
        className="flex items-center justify-between px-3 py-1 flex-shrink-0 text-[10px] font-mono"
        style={{ background: "#111113", borderTop: "1px solid rgba(255,255,255,0.04)" }}
      >
        <div className="flex items-center gap-3 text-zinc-600">
          <span className="text-blue-400">⎇ main</span>
          <span>{done ? <span className="text-emerald-400">● 1 change</span> : "○ No changes"}</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-600">
          <span>Python 3.11</span>
          <span>UTF-8</span>
          <span>Ln {Math.min(currentLine + 4, CODE_LINES.length + 3)}</span>
        </div>
      </div>
    </div>
  );
}
