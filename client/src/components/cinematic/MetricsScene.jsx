import { useEffect, useRef, useState } from "react";

import { motion } from "framer-motion";

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function useAnimatedCounter(target, duration = 1800, active = true) {
  const [value, setValue] = useState(0);
  const startTime = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    startTime.current = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.round(easeOutCubic(progress) * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, active]);

  return value;
}

function MetricCard({ label, value, suffix, prefix, subtext, color, active, barPercent = 80 }) {
  const count = useAnimatedCounter(value, 1600, active);

  return (
    <motion.div
      className="glass-card rounded-xl p-5 flex flex-col gap-3"
      style={{
        border: `1px solid ${color}20`,
        boxShadow: `0 0 30px ${color}08`,
      }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Metric value */}
      <div className="flex items-end gap-1">
        {prefix && <span className="text-2xl font-bold mb-0.5" style={{ color }}>{prefix}</span>}
        <span className="text-4xl font-extrabold tracking-tight text-white leading-none">
          {count.toLocaleString()}
        </span>
        {suffix && <span className="text-xl font-bold mb-0.5" style={{ color }}>{suffix}</span>}
      </div>

      {/* Label */}
      <p className="text-sm font-medium text-zinc-400">{label}</p>

      {/* Progress bar — scaleX is a transform (no layout thrash) */}
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div
          className="h-full rounded-full origin-left"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: barPercent / 100 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, delay: 0.3, ease: "easeOut" }}
        />
      </div>

      {/* Sub-text */}
      <p className="text-xs text-zinc-600 font-mono">{subtext}</p>
    </motion.div>
  );
}

function SparkLine({ active, color }) {
  const points = [20, 45, 30, 60, 40, 75, 55, 85, 65, 90, 72, 88, 95, 80, 92];
  const max = Math.max(...points);
  const min = Math.min(...points);

  const pathPoints = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 200;
      const y = 40 - ((p - min) / (max - min)) * 32;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg width="200" height="48" viewBox="0 0 200 48" className="overflow-visible">
      {/* Fill area */}
      <defs>
        <linearGradient id={`spark-fill-${color}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${pathPoints} L 200 48 L 0 48 Z`}
        fill={`url(#spark-fill-${color})`}
      />
      {/* Line */}
      {active && (
        <motion.path
          d={pathPoints}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 3px ${color})` }}
        />
      )}
      {/* End dot */}
      {active && (
        <motion.circle
          cx="200" cy={40 - ((points[points.length - 1] - min) / (max - min)) * 32}
          r="3"
          fill={color}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.1, duration: 0.3 }}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      )}
    </svg>
  );
}

function WaveformBar({ index, color }) {
  // Stable random duration per bar — computed once, not on every render
  const duration = useRef(0.7 + (((index * 137) % 100) / 100) * 0.4).current;
  const delay = index * 0.04;
  return (
    <motion.div
      className="w-1.5 rounded-full flex-shrink-0"
      style={{ background: color, minHeight: 4 }}
      animate={{ scaleY: [0.3, 1, 0.3] }}
      transition={{ duration, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

export function MetricsScene({ active }) {
  const metrics = [
    {
      label: "Builds per second",
      value: 847,
      suffix: "/s",
      color: "#34d399",
      subtext: "↑ 23% vs last week",
      barPercent: 84,
    },
    {
      label: "P50 Latency",
      value: 142,
      suffix: "ms",
      color: "#60a5fa",
      subtext: "webhook → worker start",
      barPercent: 56,
    },
    {
      label: "Success Rate",
      value: 99,
      suffix: ".7%",
      color: "#a78bfa",
      subtext: "21d rolling window",
      barPercent: 99,
    },
    {
      label: "Active Workers",
      value: 32,
      prefix: "",
      suffix: "",
      color: "#fbbf24",
      subtext: "across 4 regions",
      barPercent: 64,
    },
  ];

  return (
    <div className="w-full">
      {/* Top: metric cards grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <MetricCard {...m} active={active} />
          </motion.div>
        ))}
      </div>

      {/* Bottom: throughput chart */}
      <motion.div
        className="glass-card rounded-xl p-5 mt-4"
        initial={{ opacity: 0, y: 16 }}
        animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-zinc-200">Pipeline Throughput</p>
            <p className="text-xs text-zinc-500 mt-0.5">Real-time job completion rate</p>
          </div>
          <div className="flex items-center gap-1.5 h-8">
            {Array.from({ length: 32 }, (_, i) => (
              <WaveformBar key={i} index={i} color={i > 24 ? "#34d399" : "#34d39966"} />
            ))}
          </div>
        </div>

        <div className="flex items-end gap-6">
          <SparkLine active={active} color="#34d399" />
          <div className="flex flex-col gap-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-zinc-400">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-zinc-400">Queued</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-zinc-400">Failed</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
