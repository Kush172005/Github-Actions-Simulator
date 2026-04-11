import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function centerIn(child, container) {
  if (!child || !container) return { x: 0, y: 0 };
  const e = child.getBoundingClientRect();
  const c = container.getBoundingClientRect();
  return {
    x: e.left - c.left + e.width / 2,
    y: e.top - c.top + e.height / 2,
  };
}

/**
 * Scroll-scrubbed pipeline: packet + queue stack + worker burst + terminal activation.
 * Highlights use timeline `.call()` (discrete), not scroll frame state.
 */
export function useArchitectureTimeline({
  sectionRef,
  flowRef,
  refs,
  packetRef,
  stackRefs,
  setHighlight,
  setWorkerBurst,
  setTerminalActive,
}) {
  useLayoutEffect(() => {
    const section = sectionRef?.current;
    const flow = flowRef?.current;
    if (!section || !flow) return undefined;

    const {
      github,
      fastapi,
      redis,
      worker,
      terminal,
    } = refs;

    let resizeTimer;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 120);
    };
    window.addEventListener("resize", onResize);

    const ctx = gsap.context(() => {
      const measure = () => ({
        gh: centerIn(github?.current, flow),
        api: centerIn(fastapi?.current, flow),
        rq: centerIn(redis?.current, flow),
        wk: centerIn(worker?.current, flow),
        tm: centerIn(terminal?.current, flow),
      });

      const pts = measure();
      const packet = packetRef.current;
      const stacks = (stackRefs ?? []).map((r) => r?.current).filter(Boolean);

      if (!packet || !github?.current) return;

      gsap.set(packet, {
        position: "absolute",
        left: 0,
        top: 0,
        x: pts.gh.x,
        y: pts.gh.y,
        xPercent: -50,
        yPercent: -50,
        force3D: true,
      });

      stacks.forEach((el, i) => {
        gsap.set(el, {
          opacity: 0,
          scale: 0.5,
          x: pts.rq.x + (i - 1) * 8,
          y: pts.rq.y + 22 + i * 8,
          xPercent: -50,
          yPercent: -50,
        });
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=320%",
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      tl.call(() => {
        setHighlight("gh");
        setWorkerBurst(false);
        setTerminalActive(false);
      })
        .to(packet, {
          x: pts.api.x,
          y: pts.api.y,
          duration: 3,
          ease: "none",
        })
        .call(() => setHighlight("api"))
        .to(packet, {
          x: pts.rq.x,
          y: pts.rq.y,
          duration: 2.8,
          ease: "none",
        })
        .call(() => setHighlight("rq"))
        .to(packet, { x: pts.rq.x, y: pts.rq.y, duration: 0.25, ease: "none" })
        .to(
          stacks,
          {
            opacity: 1,
            scale: 1,
            stagger: 0.1,
            duration: 0.45,
            ease: "power2.out",
          },
          "<",
        )
        .to({}, { duration: 0.65 })
        .to(packet, {
          x: pts.wk.x,
          y: pts.wk.y,
          duration: 2,
          ease: "power2.in",
        })
        .call(() => {
          setHighlight("wk");
          setWorkerBurst(true);
        })
        .to({}, { duration: 0.4 })
        .call(() => setWorkerBurst(false))
        .to(packet, {
          x: pts.tm.x,
          y: pts.tm.y,
          duration: 2.6,
          ease: "power3.out",
        })
        .call(() => {
          setHighlight("tm");
          setTerminalActive(true);
        });
    }, section);

    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      ctx.revert();
    };
  }, [
    sectionRef,
    flowRef,
    refs,
    packetRef,
    stackRefs,
    setHighlight,
    setWorkerBurst,
    setTerminalActive,
  ]);
}
