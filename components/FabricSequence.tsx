"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { canPlayFabric, frameAt, loadFabric } from "@/lib/fabric";

export type FabricSequenceHandle = { seek: (progress: number) => void };

/** Only paints preprocessed pixels. Matting/encoding never runs in the browser. */
export const FabricSequence = forwardRef<FabricSequenceHandle, { kind?: "scroll" | "portal" }>(function FabricSequence({ kind = "scroll" }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const progress = useRef(0);
  const draw = useRef<(value: number) => void>(() => {});
  const [ready, setReady] = useState(false);

  useImperativeHandle(ref, () => ({ seek(value) { progress.current = value; draw.current(value); } }), []);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)");
    let controller: AbortController | undefined;
    let release: (() => void) | undefined;
    let observer: IntersectionObserver | undefined;
    function reset() {
      controller?.abort(); release?.(); release = undefined;
      observer?.disconnect(); draw.current = () => {}; setReady(false);
    }
    function setup() {
      reset();
      if (!query.matches || !canPlayFabric() || !canvas.current) return;
      const active = new AbortController();
      controller = active;
      observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        observer?.disconnect();
        void loadFabric(kind, active.signal).then(({ sequence, images, dispose }) => {
          if (active.signal.aborted) { dispose(); return; }
          release = dispose;
          const target = canvas.current;
          const context = target?.getContext("2d", { alpha: true });
          if (!target || !context) { dispose(); return; }
          target.width = sequence.width; target.height = sequence.height;
          let lastFrame = -1;
          draw.current = value => {
            const index = frameAt(sequence, value);
            if (index === lastFrame) return;
            context.clearRect(0, 0, target.width, target.height);
            context.drawImage(images[index], 0, 0);
            target.dataset.frame = String(index);
            lastFrame = index;
          };
          draw.current(progress.current); setReady(true);
        }).catch(() => { /* Keep the optimized poster and GSAP 2.5D fallback. */ });
      }, { rootMargin: "100px" });
      observer.observe(canvas.current);
    }
    setup(); query.addEventListener("change", setup);
    return () => { query.removeEventListener("change", setup); reset(); };
  }, [kind]);

  return <div className={`fabric-render ${ready ? "is-ready" : ""}`} data-kind={kind} data-sequence={ready ? "ready" : "poster"}>
    <picture>{kind === "scroll" && <source media="(max-width: 1023px)" srcSet="/fabric/poster-mobile.webp"/>}
      <img className="fabric-poster" src={kind === "scroll" ? "/fabric/poster.webp" : "/fabric/portal-poster.webp"} width={960} height={540} alt="" fetchPriority={kind === "scroll" ? "high" : "low"} decoding="async"/>
    </picture>
    <canvas ref={canvas} className="fabric-canvas" width={960} height={540} aria-hidden="true"/>
  </div>;
});
