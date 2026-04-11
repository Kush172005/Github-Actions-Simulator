# Performance (reference)

Goals: stable **60fps** during scroll, no jank on route change, no memory leaks from animation or WebGL.

---

## Properties to animate first

**Prefer:** `transform` (translate, scale, rotate) and `opacity`.

**Avoid on hot paths:** `top`, `left`, `width`, `height`, `margin` (layout thrash).  
**Use sparingly:** `filter`, `box-shadow`, large `border-radius` on big layers.

---

## GPU / compositing

- Promoting layers is not free; **do not** add `will-change` everywhere. Use for known hot elements (e.g. one hero visual) and remove when idle if possible.
- Large blurred/backdrop layers are expensive—test on low-end phones.

---

## React

- Keep animation state **local**; avoid storing tween progress in React state every frame.
- For GSAP in React: **`gsap.context()`** or **`useGSAP`** so cleanup kills tweens and ScrollTriggers scoped to the component.
- Prefer **`useLayoutEffect`** when applying start-of-frame DOM measurements for animation to avoid flash.

---

## Scroll

- **One Lenis instance** per main shell; duplicate instances fight each other and double rAF work.
- **ScrollTrigger:** After images/fonts load or layout shifts, call **`ScrollTrigger.refresh()`** (debounced on resize is common).
- Prefer **`scrub: true` or a small scrub value** for scroll-linked motion instead of spawning new tweens on every scroll event.

---

## Lists and sections

- Long pages: avoid hundreds of simultaneous `ScrollTrigger` instances; use **batch**, or **toggle a class** once in view, or virtualization for lists.
- **Intersection-based** Motion reveals are cheap; still cap concurrent springs if you see frame drops.

---

## Three.js

- **Pixel ratio:** `Math.min(devicePixelRatio, 2)` (or 1.5 on weak GPUs if needed).
- **Dispose** geometries, materials, textures, and dispose/cancel the renderer on unmount.
- **One render loop** per canvas; no duplicate `requestAnimationFrame` loops for the same scene.

---

## Loading and CLS

- Reserve space for images/video so scroll positions and `start`/`end` markers stay stable after load.
- Prefer explicit width/height or aspect-ratio containers.

---

## Tooling

- Chrome Performance panel: long tasks, layout, composite.
- React DevTools Profiler: unnecessary re-renders during animation.
