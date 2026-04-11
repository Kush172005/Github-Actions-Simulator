import Lenis from "lenis";
import { gsap } from "./gsap";

export type LenisOptions = NonNullable<ConstructorParameters<typeof Lenis>[0]>;

/**
 * Single Lenis instance per layout shell — see `/docs/lenis.md`.
 */
export function createLenis(options?: LenisOptions) {
  return new Lenis(options);
}

/**
 * Drive Lenis from GSAP’s ticker so Lenis and tweens share one frame loop.
 * Returns a **cleanup** function: call it before `destroyLenis`.
 */
export function bindLenisToGsapTicker(lenis: Lenis) {
  const tick = (time: number) => {
    lenis.raf(time * 1000);
  };
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  return () => {
    gsap.ticker.remove(tick);
  };
}

export function destroyLenis(lenis: Lenis) {
  lenis.destroy();
}
