# Technology stack (reference)

Canonical assumptions for the **real** app this repo prepares for. Adjust versions in the app’s `package.json`; this file is the intent, not a lockfile.

## Core

| Layer | Choice | Notes |
|-------|--------|--------|
| UI | **React 18+** | App Router (Next.js) **or** Vite SPA—both work; animation code stays client-bounded where needed. |
| Language | **TypeScript** | Strict mode recommended. |
| Styling | **Tailwind CSS** | Utilities for layout; motion stays in GSAP/Motion. |
| Data (if applicable) | **MongoDB** | Only when the product needs persistence; not required for animation-only work. |

## Animation

| Package | Role |
|---------|------|
| **gsap** | Core tweening; **ScrollTrigger** for scroll. Optional: **SplitText** (paid), **DrawSVG** (paid). |
| **@gsap/react** | `useGSAP` hook and React-friendly lifecycle (optional but recommended in React). |
| **motion** (`motion/react`) | Declarative UI motion, gestures, `layout`, `AnimatePresence`. |
| **lenis** | Smooth scrolling; integrate with ScrollTrigger via `scrollerProxy` or scroll sync (see `/docs/lenis.md`). |
| **three** | WebGL; pair with **@react-three/fiber** + **@react-three/drei** only if the project adopts R3F. |

## Version discipline

- Keep **one major** of GSAP across the app; register plugins once (typically in `/lib/animation/gsap.ts` or app bootstrap).
- **Motion** and **GSAP** can coexist in the bundle; separation is by **element**, not by global mutex.

## Scripts (illustrative)

```bash
npm install gsap @gsap/react motion lenis three
# Optional R3F stack:
npm install @react-three/fiber @react-three/drei
```

## Environment

- **Browser:** Evergreen + mobile Safari; test scroll + reduced motion.
- **SSR:** Mark interactive animation components with `'use client'` (Next.js) or load only on client in Vite.

## File ownership

- **Pages/sections:** Compose UI; import from `/components/animations` and hooks.
- **Animation tokens:** `/lib/animation/motion.ts` (Motion) and `/lib/animation/gsap.ts` (GSAP).
- **Scroll root:** One Lenis instance per layout shell; see `/lib/animation/scroll.ts`.
