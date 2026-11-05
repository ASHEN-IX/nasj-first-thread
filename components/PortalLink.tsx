"use client";

import { useRef, useState, type ReactNode, type MouseEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import gsap from "gsap";

const configuredUrl = process.env.NEXT_PUBLIC_NASJ_PLATFORM_URL;
const destination = configuredUrl && /^https?:\/\//.test(configuredUrl) ? configuredUrl : "/platform";

export function PortalLink({ children = "Explore NASJ", className = "button button-dark", icon = true }: { children?: ReactNode; className?: string; icon?: boolean }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);
  function navigate(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    if (leaving) return;
    setLeaving(true);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !overlayRef.current) {
      window.location.assign(destination); return;
    }
    gsap.fromTo(overlayRef.current, { yPercent: 105, opacity: 1 }, {
      yPercent: 0, duration: 0.9, ease: "power3.inOut", onComplete: () => { window.location.assign(destination); },
    });
  }
  return (
    <>
      <a href={destination} onClick={navigate} className={className} aria-busy={leaving}>
        {leaving ? "Opening NASJ…" : children} {icon && <ArrowUpRight size={17} />}
      </a>
      <div className="portal-exit" ref={overlayRef} aria-hidden="true">
        <div className="portal-exit-weave" />
        <div className="portal-exit-logo">NASJ <span lang="ar">نسج</span><small>Every story starts with a thread.</small></div>
      </div>
    </>
  );
}
