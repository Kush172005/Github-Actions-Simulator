import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

/** Shared ease strings — keep timelines consistent with PATTERNS.md */
export const EASE = {
  out: "power2.out",
  outStrong: "power3.out",
  inOut: "power2.inOut",
  none: "none",
} as const;

/**
 * Simple mount-style fade for imperative use (e.g. inside useGSAP).
 * Prefer `autoAlpha` over `opacity` so visibility is handled.
 */
export function fadeIn(el: gsap.TweenTarget) {
  return gsap.fromTo(
    el,
    { autoAlpha: 0, y: 20 },
    { autoAlpha: 1, y: 0, duration: 0.6, ease: EASE.out },
  );
}

export type ScrollRevealTweenOptions = {
  /** ScrollTrigger `start` string */
  start?: string;
  /** If true, trigger only once */
  once?: boolean;
};

/**
 * Fade/slide in when the element enters the viewport (GSAP + ScrollTrigger).
 * Cleanup: kill returned tween + associated ScrollTrigger in gsap.context revert.
 */
export function fadeInOnScroll(
  el: gsap.TweenTarget,
  options: ScrollRevealTweenOptions = {},
) {
  const { start = "top 85%", once = true } = options;
  return gsap.fromTo(
    el,
    { autoAlpha: 0, y: 24 },
    {
      autoAlpha: 1,
      y: 0,
      duration: 0.65,
      ease: EASE.out,
      scrollTrigger: {
        trigger: el as gsap.DOMTarget,
        start,
        toggleActions: once ? "play none none none" : "play none play reverse",
      },
    },
  );
}

export type BatchOptions = {
  onEnter?: (elements: Element[], triggers: ScrollTrigger[]) => void;
  start?: string;
  end?: string;
  once?: boolean;
};

/**
 * Batched ScrollTrigger for many similar elements (grids, lists).
 * @see https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.batch()/
 */
export function createScrollBatch(
  targets: gsap.DOMTarget,
  options: BatchOptions = {},
) {
  const {
    onEnter,
    start = "top 90%",
    end = "bottom top",
    once = true,
  } = options;

  return ScrollTrigger.batch(targets, {
    start,
    end,
    once,
    ...(onEnter && {
      onEnter: (elements: Element[], triggers: ScrollTrigger[]) =>
        onEnter(elements, triggers),
    }),
  });
}
