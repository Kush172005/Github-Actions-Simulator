import { forwardRef } from "react";

/** Glowing packet — position controlled by GSAP (transform only). */
export const DataPacket = forwardRef(function DataPacket(_props, ref) {
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute left-0 top-0 z-30 h-3.5 w-3.5 rounded-full bg-emerald-400 shadow-[0_0_28px_8px_rgba(52,211,153,0.55)] ring-2 ring-emerald-200/50 will-change-transform"
      aria-hidden
    />
  );
});

export function QueueStack({ stackRefs }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20" aria-hidden>
      {stackRefs.map((r, i) => (
        <div
          key={i}
          ref={r}
          className="absolute left-0 top-0 h-2 w-2 rounded-sm bg-cyan-400/90 shadow-[0_0_12px_rgba(34,211,238,0.6)] ring-1 ring-cyan-200/40 will-change-transform"
        />
      ))}
    </div>
  );
}
