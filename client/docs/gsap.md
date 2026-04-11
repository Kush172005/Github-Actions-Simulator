# GSAP (reference)

Official docs: [https://gsap.com/docs/v3/](https://gsap.com/docs/v3/)

---

## When to use GSAP here

- **ScrollTrigger:** pin, scrub, progress-based timelines, `start`/`end` strings.
- **Timelines:** chained sequences, overlapping tweens, labels, `add()`.
- **Fine easing:** custom ease, morphing SVG (with appropriate plugins), complex sequences.
- **Imperative control:** pause, reverse, seek by label (storytelling, hero orchestration).

Use **Motion** for declarative component UI (hover, tabs, modals)—see `/docs/motion.md`.

---

## Plugins (typical)

```ts
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
```

Register **once** at app or module entry (e.g. `/lib/animation/gsap.ts`).

Optional paid Club plugins: SplitText, DrawSVG—only if licensed.

---

## React integration

- **`gsap.context()`** inside `useLayoutEffect`: pass a scope function; on cleanup call `ctx.revert()`.
- Or **`useGSAP`** from `@gsap/react` (same idea: automatic cleanup).
- **Never** leave ScrollTriggers attached after the component unmounts unless they are global and intentional.

---

## ScrollTrigger essentials

| Concept | Meaning |
|--------|---------|
| `trigger` | Element whose scroll position drives the trigger (often the animated section). |
| `start` / `end` | e.g. `"top 80%"`, `"bottom top"` — when the trigger activates. |
| `scrub` | Tween progress locks to scroll (number = lag/smoothness). |
| `toggleActions` | For one-shot play/reverse on enter/leave (when not scrubbing). |
| `invalidateOnRefresh` | Recalculate after layout changes. |

After images/fonts load or DOM height changes: **`ScrollTrigger.refresh()`** (often debounced with resize).

---

## ScrollTrigger + Lenis

Lenis scrolls a wrapper or transforms content; native `window` scroll position may not match what the user sees. You must either:

- **`ScrollTrigger.scrollerProxy()`** for Lenis’s scroll element, or  
- Sync ScrollTrigger on Lenis’s **`scroll`** event and update `lenis.raf` via GSAP ticker (see `/lib/animation/scroll.ts` and `/docs/lenis.md`).

Keep **one** scroll source of truth.

---

## Batching many elements

**`ScrollTrigger.batch(selector, { onEnter: (elements, triggers) => { ... } })`** groups elements that enter around the same time—good for grids instead of hundreds of individual triggers.

---

## Performance notes

- Prefer **`autoAlpha`** over raw `opacity` when you need visibility hidden.
- Avoid reading layout (`getBoundingClientRect`, `offsetHeight`) inside high-frequency `onUpdate` unless necessary.
- Use **`will-change` sparingly** (see `/ai/PERFORMANCE.md`).

---

## Snippets (conceptual)

**Fade in once on scroll**

```ts
gsap.fromTo(
  el,
  { autoAlpha: 0, y: 24 },
  {
    autoAlpha: 1,
    y: 0,
    duration: 0.6,
    ease: 'power2.out',
    scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
  }
);
```

**Scrubbed parallax**

```ts
gsap.to(el, {
  y: -40,
  ease: 'none',
  scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true },
});
```
