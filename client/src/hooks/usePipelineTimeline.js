import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function centerOf(el, container) {
  if (!el || !container) return { x: 0, y: 0 };
  const eRect = el.getBoundingClientRect();
  const cRect = container.getBoundingClientRect();
  return {
    x: eRect.left - cRect.left + eRect.width / 2,
    y: eRect.top - cRect.top + eRect.height / 2,
  };
}

/**
 * Scroll-pinned pipeline animation:
 * - Packet travels: GitHub → FastAPI → Redis → Worker → Terminal
 * - Queue stack appears at Redis
 * - Worker burst at worker node
 * - Terminal activates at end
 * - All callbacks are discrete (no frame-level state sync)
 */
export function usePipelineTimeline({
  sectionRef,
  flowRef,
  refs,       // { github, fastapi, redis, worker, terminal }
  packetRef,
  stackRefs,  // array of refs for queue cards
  onStep,     // (stepName) => void — called at each pipeline step
  onWorkerBurst,
  onTerminalActive,
}) {
  useLayoutEffect(() => {
    const section = sectionRef?.current;
    const flow = flowRef?.current;
    if (!section || !flow) return;

    // Debounced resize → refresh
    let resizeTimer;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 150);
    };
    window.addEventListener("resize", onResize, { passive: true });

    const ctx = gsap.context(() => {
      const measure = () => ({
        gh:  centerOf(refs.github?.current,   flow),
        api: centerOf(refs.fastapi?.current,  flow),
        rq:  centerOf(refs.redis?.current,    flow),
        wk:  centerOf(refs.worker?.current,   flow),
        tm:  centerOf(refs.terminal?.current, flow),
      });

      const pts = measure();
      const packet = packetRef?.current;
      const stacks = (stackRefs ?? []).map((r) => r?.current).filter(Boolean);

      if (!packet) return;

      // Position packet at GitHub start
      gsap.set(packet, {
        position: "absolute",
        left: 0,
        top: 0,
        x: pts.gh.x,
        y: pts.gh.y,
        xPercent: -50,
        yPercent: -50,
        force3D: true,
        opacity: 0,
      });

      // Hide queue stacks initially
      stacks.forEach((el, i) => {
        gsap.set(el, {
          position: "absolute",
          left: 0,
          top: 0,
          xPercent: -50,
          yPercent: -100,
          x: pts.rq.x + (i - Math.floor(stacks.length / 2)) * 18,
          y: pts.rq.y + 28 + i * 10,
          opacity: 0,
          scale: 0.4,
          force3D: true,
        });
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=360%",
          scrub: 1.2,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh() {
            const p = measure();
            // Re-position stacks on refresh
            stacks.forEach((el, i) => {
              gsap.set(el, {
                x: p.rq.x + (i - Math.floor(stacks.length / 2)) * 18,
                y: p.rq.y + 28 + i * 10,
              });
            });
          },
        },
      });

      // STEP 0: Packet appears at GitHub
      tl
        .call(() => { onStep?.("gh"); onWorkerBurst?.(false); onTerminalActive?.(false); })
        .to(packet, { opacity: 1, duration: 0.5, ease: "power2.out" })
        .to({}, { duration: 1 }) // Brief hold

        // STEP 1: Packet travels to FastAPI
        .to(packet, { x: pts.api.x, y: pts.api.y, duration: 3, ease: "none" })
        .call(() => onStep?.("api"))
        .to({}, { duration: 0.8 })

        // STEP 2: Packet travels to Redis + queue appears
        .to(packet, { x: pts.rq.x, y: pts.rq.y, duration: 2.5, ease: "none" })
        .call(() => onStep?.("rq"))
        .to(
          stacks,
          { opacity: 1, scale: 1, stagger: 0.1, duration: 0.5, ease: "back.out(1.7)" },
          "<0.3"
        )
        .to({}, { duration: 1 })

        // STEP 3: Packet launches to Worker
        .to(stacks, { opacity: 0, scale: 0.6, stagger: 0.05, duration: 0.3, ease: "power2.in" })
        .to(packet, { x: pts.wk.x, y: pts.wk.y, duration: 1.8, ease: "power3.in" })
        .call(() => { onStep?.("wk"); onWorkerBurst?.(true); })
        .to({}, { duration: 0.5 })
        .call(() => onWorkerBurst?.(false))
        .to({}, { duration: 0.5 })

        // STEP 4: Packet exits to Terminal
        .to(packet, { x: pts.tm.x, y: pts.tm.y, duration: 2.5, ease: "power3.out" })
        .call(() => { onStep?.("tm"); onTerminalActive?.(true); })
        .to(packet, { opacity: 0, scale: 0.5, duration: 0.6, ease: "power2.in" })
        .to({}, { duration: 1 });
    }, section);

    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      ctx.revert();
    };
  }, [
    sectionRef, flowRef, refs,
    packetRef, stackRefs,
    onStep, onWorkerBurst, onTerminalActive,
  ]);
}
