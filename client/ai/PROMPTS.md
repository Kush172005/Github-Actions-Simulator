# Prompts (reference)

Copy-paste and edit bracketed parts. These align with `AGENTS.md`, `PATTERNS.md`, and `PERFORMANCE.md`.

---

## System & architecture

**Plan animation architecture**  
"Review `/ai/STACK.md` and `/components/animations`. Propose how [feature area] should split between Motion (UI) and GSAP (scroll). Call out one Lenis + ScrollTrigger strategy and where `ScrollTrigger.refresh` runs."

**Audit performance**  
"Analyze [file or route] for layout thrashing, duplicate scroll listeners, and GSAP/Three cleanup. List concrete fixes in order of impact."

---

## Components

**New primitive**  
"Add a reusable `[Name]` component under `/components/animations` using Motion, typed props, and tokens from `/lib/animation/motion.ts`. Respect `prefers-reduced-motion`. No GSAP on the same DOM node."

**Scroll section (GSAP)**  
"Implement a scroll section: [describe]. Use GSAP + ScrollTrigger in a client component with `gsap.context` cleanup. If Lenis is active, integrate with the project’s scroll helper from `/lib/animation/scroll.ts` and `/docs/lenis.md`."

---

## Motion-specific

**Variants refactor**  
"Extract repeated `initial`/`animate`/`transition` from [component] into `/lib/animation/motion.ts` as named variants. Keep behavior identical."

**Route transition**  
"Add `AnimatePresence` route transitions for [router setup]: exit fade + slight Y, enter fade. Duration ≤ 0.5s; handle reduced motion."

---

## GSAP-specific

**Timeline**  
"Build a GSAP timeline for [sequence]: [steps]. Single timeline, labeled if helpful, reversible cleanup on unmount."

**Batch reveals**  
"Replace per-element ScrollTriggers with `ScrollTrigger.batch` (or document why not) for [list selector]. Stagger inside `onEnter`."

---

## Lenis + ScrollTrigger

**Integration**  
"Wire Lenis so ScrollTrigger uses the Lenis scroller. Document `scrollerProxy` or scroll event sync in `/docs/lenis.md` snippet. Ensure `refresh` on resize."

---

## Three.js

**Minimal scene**  
"Add a Three.js scene in `[Component].tsx`: [geometry]. Single rAF loop, DPR cap, full disposal on unmount. No animation logic in React state per frame."

---

## Accessibility

**Reduced motion**  
"Update [components] to respect `prefers-reduced-motion`: branch Motion transitions and skip or simplify GSAP scroll scrub where appropriate."

---

## Refactors

**Migrate inline**  
"Move inline animations from `[page].tsx` into `/components/animations` or a small hook; preserve timing and reduce parent re-renders."
