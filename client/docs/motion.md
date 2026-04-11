# Motion (Framer Motion API) (reference)

Package: **`motion`** — import from **`motion/react`** in React.

Docs: [https://motion.dev/docs/react](https://motion.dev/docs/react)

---

## When to use Motion here

- **Mount / unmount:** `initial` → `animate`, exit with **`AnimatePresence`**.
- **Gestures:** `whileHover`, `whileTap`, `drag` (when needed).
- **Layout:** `layout` prop for shared-layout–style transitions (use sparingly; has cost).
- **Viewport:** `whileInView` for simple scroll-into-view (alternative to GSAP for lightweight cases).

Use **GSAP** for scroll-linked **scrub**, **pin**, and heavy **timeline** choreography—see `/docs/gsap.md`.

---

## Variants

Group states as objects and reference by name:

```tsx
const variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

<motion.div variants={variants} initial="hidden" animate="visible" />
```

**Stagger:** parent `transition: { staggerChildren: 0.06 }`, children use their own variants (see `/lib/animation/motion.ts` and `Stagger.tsx`).

---

## Transitions

- **Tween:** `duration`, `ease` (e.g. cubic bezier array `[0.25, 0.1, 0.25, 1]`).
- **Spring:** `type: 'spring'`, `stiffness`, `damping`, `mass`.

Shared tokens live in **`/lib/animation/motion.ts`** (`transitionSoft`, `transitionSnappy`).

---

## `AnimatePresence`

- Wrap conditionally rendered motion components so **exit** animations run.
- Common pattern: `mode="wait"` so outgoing finishes before incoming.

---

## `layout` and `layoutId`

- **`layout`:** animates layout changes when React re-renders new position/size.
- **`layoutId`:** shared element transitions between two trees (e.g. list → detail).  
Use only where the UX benefit justifies the work; profile on mobile.

---

## Accessibility: reduced motion

```tsx
import { useReducedMotion } from 'motion/react';

const reduce = useReducedMotion();
const transition = reduce ? { duration: 0.01 } : transitionSoft;
```

Also respect **`prefers-reduced-motion`** for GSAP timelines (skip scrub, shorten duration)—see `/ai/PATTERNS.md`.

---

## SSR / Next.js

Interactive motion components should live in **`'use client'`** files. Avoid hydration mismatches: optional `initial={false}` when state is restored from storage.

---

## Conflict with GSAP

**Do not** attach both Motion’s `animate` and GSAP’s `gsap.to` to the **same** DOM node. Nest instead: outer Motion for layout, inner `ref` for GSAP, or split by lifecycle.
