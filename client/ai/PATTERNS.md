# Animation patterns (reference)

Design goal: **subtle > flashy**, **smooth > snappy-at-all-costs**, **consistent** motion language.

---

## Token defaults (starting points)

| Token | Suggested value | Use |
|-------|-----------------|-----|
| Fade distance (Y) | `12–24px` | Reveals, cards |
| Fade duration | `0.4–0.6s` | UI blocks |
| Stagger between children | `0.05–0.08s` | Lists, grids |
| Hover scale | `1.02–1.05` | Buttons, cards |
| Spring (Motion) | stiffness ~400, damping ~25–30 | Hovers, toggles |

Tweak per brand; keep deltas small for “premium” feel.

---

## 1. Fade in (mount)

- **Motion:** `FadeIn` — opacity `0→1`, `y` optional.
- **GSAP:** `gsap.fromTo(el, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' })`.
- Prefer **`autoAlpha`** in GSAP (handles `visibility`).

---

## 2. Stagger (lists)

- **Motion:** `Stagger` wraps children; each child gets staggered variant.
- **Grid/flex:** Put `gap` on the parent `Stagger` container; each child is wrapped in a motion `div` (structure in component).
- **GSAP:** `stagger` on timeline or `ScrollTrigger.batch` for many similar nodes entering together.

---

## 3. Scroll reveal

- **Motion (Intersection-style):** `ScrollReveal` — `whileInView`, `viewport.once: true` for fire-once sections.
- **GSAP (scroll-linked):** `ScrollTrigger.create({ trigger, start, end, scrub / toggleActions })` — use for pinned sections and scrubbed progress.

**When to choose which:** In-view fade-in → Motion is enough. Parallax, pin, scrub → GSAP.

---

## 4. Hero

- Sequence: background → headline → subcopy → CTAs (stagger ~0.08–0.12s).
- Avoid simultaneous blur + scale + fade on huge text (GPU cost); pick **one** accent (e.g. fade + slight Y).

---

## 5. Hover / press

- **Motion:** `HoverScale` or `whileHover` / `whileTap` with spring.
- Do not animate **box-shadow** on huge areas every frame; use opacity layers or a pseudo-element if you need glow.

---

## 6. Page / route transition

- **Motion:** `AnimatePresence` + `mode="wait"` for sequential out→in.
- Keep duration **under ~0.5s** for route changes unless intentional storytelling.

---

## 7. Reduced motion

- Respect `prefers-reduced-motion: reduce`: shorten to instant or near-instant transitions, disable parallax/scrub gimmicks.
- Motion: `useReducedMotion()` from `motion/react` to branch transitions.
- GSAP: set `duration: 0` or skip non-essential tweens when reduced.

---

## Component cheat sheet

| Need | Component / API |
|------|-----------------|
| On load fade | `FadeIn` |
| List entrance | `Stagger` |
| In-view section | `ScrollReveal` or `Stagger` + `whileInView` |
| Card / button hover | `HoverScale` |
| Scroll choreography | GSAP timeline + ScrollTrigger in effect |
