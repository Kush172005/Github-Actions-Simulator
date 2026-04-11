import type { Transition, Variants } from "motion/react";

export const transitionSnappy: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 28,
};

export const transitionSoft: Transition = {
  duration: 0.45,
  ease: [0.25, 0.1, 0.25, 1],
};

/** Use when `useReducedMotion()` is true (or matchMedia) — near-instant */
export const transitionReduced: Transition = {
  duration: 0.01,
};

/**
 * Snapshot check for SSR-safe initial render in client components.
 * For live updates when the user toggles OS setting, prefer `useReducedMotion()` from `motion/react`.
 */
export function getReducedMotionTransition(
  active: Transition = transitionSoft,
  reduced: Transition = transitionReduced,
): Transition {
  if (typeof window === "undefined") return active;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? reduced
    : active;
}

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitionSoft,
  },
};

export function staggerContainer(
  stagger = 0.06,
  delayChildren = 0,
): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: stagger,
        delayChildren,
      },
    },
  };
}

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitionSoft,
  },
};

export const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitionSoft,
  },
};

export const fadeOnlyVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: transitionSoft,
  },
};
