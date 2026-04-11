import { forwardRef } from "react";

/** Glowing packet — GSAP MotionPath or manual x/y. transform-only. */
export const DataPacket = forwardRef(function DataPacket({ className = "" }, ref) {
  return (
    <div
      ref={ref}
      className={`pointer-events-none absolute left-0 top-0 z-30 h-3 w-3 -translate-x-1/2 -translate-y-1/2 will-change-transform ${className}`}
      aria-hidden
    >
      <div className="h-full w-full rounded-full bg-emerald-400 shadow-[0_0_20px_6px_rgba(52,211,153,0.65)] ring-2 ring-emerald-200/60" />
      <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400/40" />
    </div>
  );
});
