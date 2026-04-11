import { useEffect, useRef, useCallback } from "react";
import styles from "./ShootingStars.module.css";

const STAR_COUNT = 120;
const MAX_METEORS = 6;
const SPAWN_MIN_MS = 900;
const SPAWN_MAX_MS = 5200;

function pickMeteorMotion(w, h) {
  const dist = 480 + Math.random() * 600;
  const roll = Math.random();

  let sx;
  let sy;
  let angleRad;

  if (roll < 0.34) {
    sx = -0.2 * w + Math.random() * w * 1.45;
    sy = -40 - Math.random() * (h * 0.42);
    angleRad = ((32 + Math.random() * 38) * Math.PI) / 180;
  } else if (roll < 0.58) {
    sx = -120 - Math.random() * (w * 0.42);
    sy = -0.08 * h + Math.random() * h * 0.62;
    angleRad = ((22 + Math.random() * 42) * Math.PI) / 180;
  } else if (roll < 0.72) {
    sx = -180 - Math.random() * 340;
    sy = -60 - Math.random() * 280;
    angleRad = ((28 + Math.random() * 35) * Math.PI) / 180;
  } else if (roll < 0.86) {
    sx = w * 0.55 + Math.random() * (w * 0.55);
    sy = -50 - Math.random() * (h * 0.35);
    angleRad = ((118 + Math.random() * 38) * Math.PI) / 180;
  } else if (roll < 0.94) {
    sx = -100 - Math.random() * 200;
    sy = -20 - Math.random() * 120;
    angleRad = ((12 + Math.random() * 22) * Math.PI) / 180;
  } else {
    sx = -80 - Math.random() * 160;
    sy = h * 0.15 + Math.random() * h * 0.45;
    angleRad = ((18 + Math.random() * 28) * Math.PI) / 180;
  }

  const dx = Math.cos(angleRad) * dist;
  const dy = Math.sin(angleRad) * dist;
  const rot = angleRad + (Math.random() - 0.5) * 0.08;

  return { sx, sy, dx, dy, rot };
}

/**
 * Meteors use Web Animations API (explicit px transforms) — CSS @keyframes + var() is flaky in some browsers.
 */
export function ShootingStars() {
  const starfieldRef = useRef(null);
  const meteorLayerRef = useRef(null);
  const activeRef = useRef(0);
  const timerRef = useRef(null);
  const rafParallaxRef = useRef(null);
  const scrollYRef = useRef(0);

  const spawnMeteor = useCallback(() => {
    const layer = meteorLayerRef.current;
    if (!layer || activeRef.current >= MAX_METEORS) return;

    const w = layer.clientWidth || window.innerWidth || 1200;
    const h = layer.clientHeight || window.innerHeight || 800;

    const rare = Math.random() < 0.16;
    const { sx, sy, dx, dy, rot } = pickMeteorMotion(w, h);
    /* Slower, smoother passes — ~1.9–3.4s typical, ~2.6–4.2s rare */
    const durationMs = ((rare ? 2.6 : 1.85) + Math.random() * (rare ? 1.6 : 1.55)) * 1000;

    const x0 = sx;
    const y0 = sy;
    const x1 = sx + dx;
    const y1 = sy + dy;

    const el = document.createElement("div");
    el.className = `${styles.meteor} ${rare ? styles.meteorRare : ""}`;

    const tail = document.createElement("div");
    tail.className = styles.tail;
    const head = document.createElement("div");
    head.className = styles.head;
    el.appendChild(tail);
    el.appendChild(head);

    activeRef.current += 1;
    layer.appendChild(el);

    const t0 = `translate3d(${x0}px, ${y0}px, 0) rotate(${rot}rad) scale(0.9)`;
    const t1 = `translate3d(${x1}px, ${y1}px, 0) rotate(${rot}rad) scale(1.02)`;

    const anim = el.animate(
      [
        { opacity: 0, transform: t0 },
        { opacity: 1, offset: 0.12 },
        { opacity: 1, offset: 0.88 },
        { opacity: 0, transform: t1 },
      ],
      {
        duration: durationMs,
        /* Smooth acceleration / deceleration along the path */
        easing: "cubic-bezier(0.42, 0, 0.2, 1)",
        fill: "forwards",
      },
    );

    anim.onfinish = () => {
      anim.cancel();
      if (el.parentNode) el.parentNode.removeChild(el);
      activeRef.current = Math.max(0, activeRef.current - 1);
    };
  }, []);

  useEffect(() => {
    const field = starfieldRef.current;
    if (!field) return undefined;

    const frag = document.createDocumentFragment();
    for (let i = 0; i < STAR_COUNT; i += 1) {
      const s = document.createElement("span");
      s.className = styles.star;
      s.style.left = `${Math.random() * 100}%`;
      s.style.top = `${Math.random() * 100}%`;
      const size = 1.1 + Math.random() * 2.6;
      s.style.width = `${size}px`;
      s.style.height = `${size}px`;
      const dur = 1.8 + Math.random() * 3.8;
      s.style.animationDuration = `${dur}s`;
      s.style.animationDelay = `${Math.random() * 6}s`;
      frag.appendChild(s);
    }
    field.appendChild(frag);

    const scheduleNext = () => {
      const gap = SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS);
      timerRef.current = window.setTimeout(() => {
        spawnMeteor();
        if (Math.random() < 0.14 && activeRef.current < MAX_METEORS - 2) {
          const burst = 1 + Math.floor(Math.random() * 2);
          for (let b = 0; b < burst; b += 1) {
            window.setTimeout(() => spawnMeteor(), 80 + b * 160 + Math.random() * 100);
          }
        }
        scheduleNext();
      }, gap);
    };
    scheduleNext();
    spawnMeteor();
    spawnMeteor();

    const onScroll = () => {
      scrollYRef.current = window.scrollY || 0;
      if (rafParallaxRef.current != null) return;
      rafParallaxRef.current = requestAnimationFrame(() => {
        rafParallaxRef.current = null;
        const y = scrollYRef.current * 0.045;
        if (starfieldRef.current) {
          starfieldRef.current.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener("scroll", onScroll);
      if (rafParallaxRef.current) cancelAnimationFrame(rafParallaxRef.current);
      field.innerHTML = "";
      if (meteorLayerRef.current) meteorLayerRef.current.innerHTML = "";
    };
  }, [spawnMeteor]);

  return (
    <div className={styles.root} aria-hidden>
      <div ref={starfieldRef} className={styles.starfield} />
      <div ref={meteorLayerRef} className={styles.meteorLayer} />
    </div>
  );
}
