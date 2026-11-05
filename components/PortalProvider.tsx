"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import { canPlayFabric, frameAt, loadFabric } from "@/lib/fabric";

const configured = process.env.NEXT_PUBLIC_NASJ_PLATFORM_URL;
export const platformDestination = (() => {
  try { const url = new URL(configured || ""); return /^https?:$/.test(url.protocol) ? url.href : "/platform"; }
  catch { return "/platform"; }
})();

type PortalContextValue = { busy: boolean; prepare: () => void; enter: (event: MouseEvent<HTMLAnchorElement>) => void };
const PortalContext = createContext<PortalContextValue | null>(null);
export function usePortal() {
  const context = useContext(PortalContext);
  if (!context) throw new Error("PortalLink requires PortalProvider");
  return context;
}

/** One viewport-level portal, outside all hero transforms and clipped/filtered ancestors. */
export function PortalProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const overlay = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const busyRef = useRef(false);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const watchdog = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const controller = useRef<AbortController | undefined>(undefined);
  const loaded = useRef<Awaited<ReturnType<typeof loadFabric>> | undefined>(undefined);
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const reset = useCallback(() => {
    timeline.current?.kill(); clearTimeout(watchdog.current);
    if (overlay.current) gsap.set(overlay.current, { autoAlpha: 0 });
    busyRef.current = false; setBusy(false); setNotice("");
  }, []);

  useEffect(() => {
    setMounted(true);
    const pageShow = () => reset();
    window.addEventListener("pageshow", pageShow);
    return () => {
      window.removeEventListener("pageshow", pageShow);
      timeline.current?.kill(); clearTimeout(watchdog.current);
      controller.current?.abort(); loaded.current?.dispose(); loaded.current = undefined;
      controller.current = undefined;
    };
  }, [reset]);
  useEffect(() => { reset(); }, [pathname, reset]);

  function prepare() {
    if (controller.current || loaded.current || !canPlayFabric() || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const active = new AbortController(); controller.current = active;
    void loadFabric("portal", active.signal).then(result => {
      if (active.signal.aborted) { result.dispose(); return; }
      loaded.current = result;
    }).catch(() => { if (controller.current === active) controller.current = undefined; });
  }

  function navigate() {
    try {
      // The opaque real-textile layer has reached full coverage at this point.
      if (platformDestination.startsWith("/")) router.push(platformDestination);
      else window.location.assign(platformDestination);
      watchdog.current = setTimeout(() => {
        reset(); setNotice("If NASJ did not open, you can try the direct link.");
      }, 4000);
    } catch {
      reset(); setNotice("NASJ could not open. Please try the direct link.");
    }
  }

  function enter(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0 || event.currentTarget.target === "_blank") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    event.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setNotice("");
    const target = overlay.current;
    if (!target) { navigate(); return; }
    timeline.current?.kill();
    const textile = target.querySelector(".portal-textile");
    const cover = target.querySelector(".portal-cover");
    const mark = target.querySelector(".portal-exit-logo");
    gsap.set(target, { autoAlpha: 1 });
    gsap.set(textile, { yPercent: 25, scale: 1, rotation: -8 });
    gsap.set(cover, { opacity: 0 }); gsap.set(mark, { opacity: 0 });
    const resource = loaded.current;
    const context = canvas.current?.getContext("2d", { alpha: true });
    const output = canvas.current;
    if (output && context) {
      context.clearRect(0, 0, output.width, output.height);
      output.style.opacity = resource ? "1" : "0";
    }
    let last = -1;
    const state = { progress: 0 };
    const duration = window.innerWidth < 1024 || !canPlayFabric() ? .65 : 1.3;
    function paint() {
      if (!resource || !context || !output) return;
      const index = frameAt(resource.sequence, state.progress);
      if (last === index) return;
      context.clearRect(0, 0, output.width, output.height);
      context.drawImage(resource.images[index], 0, 0, output.width, output.height); last = index;
    }
    paint();
    timeline.current = gsap.timeline({ onComplete: navigate })
      .to(state, { progress: 1, duration, ease: "none", onUpdate: paint }, 0)
      .to(textile, { yPercent: -5, scale: 1.55, rotation: 0, duration, ease: "power2.inOut" }, 0)
      .to(cover, { opacity: 1, duration: duration * .3, ease: "power1.in" }, duration * .67)
      .to(mark, { opacity: 1, duration: .15 }, duration * .8);
  }

  return <PortalContext.Provider value={{ busy, prepare, enter }}>
    {children}
    {notice && <div className="portal-notice" role="status">{notice} <a href={platformDestination}>Open NASJ ↗</a><button aria-label="Dismiss navigation message" onClick={() => setNotice("")}>×</button></div>}
    {mounted && createPortal(<div ref={overlay} className="portal-exit" aria-hidden="true" data-active={busy}>
      <div className="portal-textile"><img src="/fabric/portal-poster.webp" width={640} height={360} alt=""/><canvas ref={canvas} width={640} height={360}/></div>
      <div className="portal-cover"/>
      <div className="portal-exit-logo">NASJ <span lang="ar">نسج</span><small>Every story starts with a thread.</small></div>
    </div>, document.body)}
  </PortalContext.Provider>;
}
