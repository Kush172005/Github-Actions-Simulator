# Lenis (reference)

Lenis adds **smooth, inertial scrolling**. It is not a replacement for your layout; it wraps or drives scroll so movement feels damped.

Repo: [https://github.com/darkroomengineering/lenis](https://github.com/darkroomengineering/lenis)

---

## Role in this stack

| Without Lenis | With Lenis |
|-------------|------------|
| Native scroll; ScrollTrigger uses `window` / document scroller | Same triggers, but **scroll position and physics** come from Lenis |
| | Must **sync** GSAP ScrollTrigger (see below) |

---

## Instance count

- Use **one Lenis instance** per main scroll shell (e.g. root layout).
- Nested Lenis instances are almost always wrong and cause double smoothing or broken scroll height.

---

## Animation frame

Lenis expects **`lenis.raf(time)`** each frame, with `time` in **milliseconds** (compatible with `requestAnimationFrame`).

Common patterns:

1. **Standalone:** `requestAnimationFrame` loop calling `lenis.raf(time)`.
2. **With GSAP:** add a ticker callback so Lenis and GSAP share timing — see **`bindLenisToGsapTicker`** in `/lib/animation/scroll.ts`.

---

## Destroy

When the layout unmounts (SPA route change):

1. Remove ticker / rAF callback first (if using `bindLenisToGsapTicker`, call the returned cleanup).
2. **`lenis.destroy()`**

---

## GSAP ScrollTrigger integration

ScrollTrigger must use the **same scrollable element and scroll position** Lenis updates. Typical approaches:

### A. `scrollerProxy`

Point ScrollTrigger at Lenis’s element and implement `scrollTop` / `scrollHeight` / `clientHeight` so GSAP reads Lenis’s virtual scroll.

### B. Scroll event + refresh

Listen to Lenis **`scroll`** and call **`ScrollTrigger.update()`** (and sometimes **`ScrollTrigger.refresh()`** after layout).

Exact wiring depends on Lenis version and whether the document or a div scrolls—implement once in **`/lib/animation/scroll.ts`** and reuse.

---

## Options (conceptual)

Lenis accepts options such as:

- **duration / easing** — feel of the smooth scroll
- **orientation** — vertical vs horizontal
- **smoothWheel** — enable/disable wheel smoothing
- **touchMultiplier** — touch behavior

Tune for your product; defaults are a reasonable start.

---

## Accessibility

Some users expect **native** scroll stepping (keyboard, reduced motion). Consider:

- Disabling or toning down Lenis when **`prefers-reduced-motion: reduce`** is set, or
- Providing a site setting that restores native scroll.

---

## CSS

Lenis often sets classes on `html` (e.g. `lenis`, `lenis-smooth`). Ensure global styles don’t fight `overflow` on `html`/`body`; follow Lenis README for the version you install.
