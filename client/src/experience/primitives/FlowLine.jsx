import { forwardRef } from "react";

export const FlowLine = forwardRef(function FlowLine({ pathD = "", className = "" }, ref) {
  return (
    <svg
      ref={ref}
      className={`pointer-events-none absolute inset-0 h-full w-full overflow-visible ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient id="flow-line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgb(139 92 246)" stopOpacity="0.95" />
          <stop offset="40%" stopColor="rgb(34 211 238)" stopOpacity="0.85" />
          <stop offset="100%" stopColor="rgb(52 211 153)" stopOpacity="0.95" />
        </linearGradient>
        <filter id="flow-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        id="pipelinePathGlow"
        d={pathD}
        fill="none"
        stroke="url(#flow-line-grad)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeOpacity="0.25"
        filter="url(#flow-glow)"
      />
      <path
        id="pipelinePath"
        d={pathD}
        fill="none"
        stroke="url(#flow-line-grad)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="4 10"
      />
    </svg>
  );
});
