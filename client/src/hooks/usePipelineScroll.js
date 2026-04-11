import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function remapPathProgress(p) {
  if (p <= 0.2) return (p / 0.2) * 0.16;
  if (p <= 0.48) return 0.16 + ((p - 0.2) / 0.28) * 0.18;
  if (p <= 0.68) return 0.34 + ((p - 0.48) / 0.2) * 0.16;
  return 0.5 + ((p - 0.68) / 0.32) * 0.5;
}

export function smoothPath(pts) {
  if (!pts?.length) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const cx1 = p0.x + (p1.x - p0.x) * 0.42;
    const cy1 = p0.y;
    const cx2 = p0.x + (p1.x - p0.x) * 0.58;
    const cy2 = p1.y;
    d += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p1.x} ${p1.y}`;
  }
  return d;
}

export function center(el, root) {
  if (!el || !root) return { x: 0, y: 0 };
  const a = el.getBoundingClientRect();
  const b = root.getBoundingClientRect();
  return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2 };
}

export function usePipelineScroll({
  pinRef,
  diagramRef,
  pathD,
  packetRef,
  waveRef,
  terminalRef,
  setPhase,
  setQueueHot,
  setWorkerBurst,
}) {
  const phaseRef = useRef("");
  const streamStartedRef = useRef(false);

  useLayoutEffect(() => {
    const pin = pinRef?.current;
    const diagram = diagramRef?.current;
    const packet = packetRef?.current;
    if (!pin || !diagram || !packet || !pathD) return undefined;

    const pathEl = diagram.querySelector("#pipelinePath");
    if (!pathEl) return undefined;

    streamStartedRef.current = false;
    phaseRef.current = "";

    const len = pathEl.getTotalLength() || 1;

    gsap.set(packet, {
      position: "absolute",
      left: 0,
      top: 0,
      xPercent: -50,
      yPercent: -50,
      force3D: true,
    });

    gsap.set(pathEl, {
      strokeDasharray: len,
      strokeDashoffset: len,
    });

    const wave = waveRef?.current;

    const st = ScrollTrigger.create({
      trigger: pin,
      pin: true,
      start: "top top",
      end: "+=440%",
      scrub: 0.75,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress;
        const pr = remapPathProgress(p);
        const pt = pathEl.getPointAtLength(pr * len);
        gsap.set(packet, { x: pt.x, y: pt.y });
        gsap.set(pathEl, { strokeDashoffset: len * (1 - pr) });

        if (wave) {
          const wp = Math.min(1, p / 0.16);
          gsap.set(wave, {
            scale: 0.35 + wp * 3,
            opacity: Math.max(0, 0.8 - wp * 1.1),
          });
        }

        let ph = "gh";
        if (p > 0.12) ph = "api";
        if (p > 0.28) ph = "redis";
        if (p > 0.44) ph = "worker";
        if (p > 0.6) ph = "term";

        if (ph !== phaseRef.current) {
          phaseRef.current = ph;
          setPhase(ph);
        }

        setQueueHot(p > 0.24 && p < 0.58);
        setWorkerBurst(p > 0.44 && p < 0.54);

        if (p > 0.72 && !streamStartedRef.current) {
          streamStartedRef.current = true;
          terminalRef?.current?.startStream?.();
        }
        if (p < 0.68) {
          streamStartedRef.current = false;
          terminalRef?.current?.reset?.();
        }
      },
    });

    return () => st.kill();
  }, [
    pinRef,
    diagramRef,
    pathD,
    packetRef,
    waveRef,
    terminalRef,
    setPhase,
    setQueueHot,
    setWorkerBurst,
  ]);
}
