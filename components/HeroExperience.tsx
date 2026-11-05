"use client";

import { useRef } from "react";
import { ArrowDown, ArrowUpRight, Gift, HeartHandshake, Layers3, Play, Sprout } from "lucide-react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { FirstThreadBadge } from "@/components/Brand";
import { CatalogScreen, RequestScreen, MiniPlatformCard } from "@/components/PlatformUI";
import { PortalLink } from "@/components/PortalLink";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function HeroExperience() {
  const scene = useRef<HTMLElement>(null);

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(min-width: 761px) and (prefers-reduced-motion: no-preference)", () => {
      const scoped = gsap.utils.selector(scene);
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: scene.current, pin: true, start: "top top", end: "+=280%", scrub: 0.85, anticipatePin: 1, invalidateOnRefresh: true },
      });
      tl.to(scoped(".hero-copy"), { yPercent: -10, autoAlpha: 0.05, duration: 0.9 }, 0.04)
        .to(scoped(".hero-benefits"), { y: 85, autoAlpha: 0, duration: 0.55 }, 0.08)
        .to(scoped(".hero-catalog"), { x: 65, y: -70, rotateZ: 8, rotateY: 18, autoAlpha: 0.1, duration: 1.1 }, 0.05)
        .to(scoped(".hero-request"), { x: 85, y: 20, rotateZ: 12, autoAlpha: 0.15, duration: 1.1 }, 0.05)
        .to(scoped(".golden-orbit"), { scale: 1.2, filter: "brightness(1.6)", opacity: 1, duration: 0.6 }, 0.06)
        // 01: Lift the textile, keeping the underlying UI in the background.
        .to(scoped(".fabric-piece"), { y: -110, x: -80, rotateZ: -8, rotateX: 18, scale: 1.5, duration: 0.68 }, 0.12)
        .to(scoped(".fabric-photo"), { skewY: -5, scaleY: 1.08, filter: "contrast(1.12) saturate(1.13) brightness(1.08)", duration: 0.64 }, 0.12)
        // 02: Move it forward in perspective, using a 2.5D camera approach.
        .to(scoped(".fabric-piece"), { x: 0, y: -55, rotationY: -24, rotationZ: -18, scale: 7, z: 350, duration: 1.0 }, 0.79)
        .to(scoped(".fabric-photo"), { skewY: 4, scaleY: 0.94, duration: 0.8 }, 0.79)
        .to(scoped(".portal-fabric-screen"), { autoAlpha: 1, duration: 0.36 }, 1.14)
        // 03: Sweep away the fabric screen to reveal distinct, real HTML previews.
        .to(scoped(".portal-reveal"), { autoAlpha: 1, yPercent: 0, duration: 0.3 }, 1.43)
        .to(scoped(".portal-fabric-screen"), { yPercent: -105, duration: 0.78, ease: "power2.inOut" }, 1.57)
        .fromTo(scoped(".reveal-card"), { y: 80, rotateX: -9, opacity: 0 }, { y: 0, rotateX: 0, opacity: 1, stagger: 0.13, duration: 0.7, ease: "power2.out" }, 1.84);
      return () => { tl.kill(); };
    });
    return () => media.revert();
  }, { scope: scene });

  return (
    <section id="overview" ref={scene} className="hero-stage" aria-label="Introducing NASJ First Thread">
      <div className="hero-stage-inner">
        <div className="hero-glow glow-one"/><div className="hero-glow glow-two"/>
        <div className="hero-content container-wide">
          <div className="hero-copy">
            <div className="hero-overline"><FirstThreadBadge subtle /></div>
            <h1>The First<br/><em>Thread.</em><span className="arabic-hero" lang="ar">الخيط الأوّل</span></h1>
            <p>Every meaningful connection starts with a single thread. Be among the first to experience NASJ—where handcrafted gifts create opportunities for women artisans.</p>
            <div className="hero-ctas"><Link href="/#join" className="button button-gold button-hero"><HeartHandshake size={18}/> Join the First Thread <ArrowUpRight size={18}/></Link><Link href="/#platform" className="button button-outline"><Play size={15}/> Discover the platform</Link></div>
            <div className="hero-note"><div className="avatar-stack"><span>✧</span><span>✺</span><span>✳</span></div><p>Early access for companies,<br/>associations and artisans.</p></div>
          </div>
          <div className="hero-visual" aria-label="Illustrative preview of the NASJ platform">
            <div className="golden-orbit" />
            <div className="hero-catalog"><CatalogScreen /></div>
            <div className="hero-request"><RequestScreen /></div>
            <div className="fabric-piece" aria-hidden="true"><div className="fabric-back"/><img className="fabric-photo" src="/images/fabric-cutout.png" alt=""/><div className="fabric-shine"/></div>
            <div className="hero-visual-label">A platform for gifts with a story. <span>↗</span></div>
          </div>
        </div>
        <div className="hero-bottom container-wide"><div className="hero-benefits"><div><Gift/><span><strong>Meaningful gifts</strong><small>Thoughtful and handmade</small></span></div><div><HeartHandshake/><span><strong>Real opportunities</strong><small>For women artisans</small></span></div><div><Layers3/><span><strong>One connected space</strong><small>From request to delivery</small></span></div><div><Sprout/><span><strong>Lasting impact</strong><small>Made with communities</small></span></div></div><div className="hero-scroll"><ArrowDown size={15}/> Scroll to discover</div></div>

        <div className="portal-reveal" aria-label="NASJ platform tour">
          <div className="reveal-overline">A LOOK INSIDE NASJ <span>✳</span> THE MAIN PLATFORM</div>
          <div className="reveal-text"><span className="section-eyebrow">THE PLATFORM</span><h2>One idea.<br/><em>Many connections.</em></h2><p>Explore how NASJ brings companies, cooperatives, and artisans into one thoughtful gifting journey.</p><PortalLink className="button button-dark button-hero">Explore NASJ</PortalLink></div>
          <div className="reveal-cards"><div className="reveal-card card-one"><MiniPlatformCard type="catalog"/></div><div className="reveal-card card-two"><MiniPlatformCard type="quote"/></div><div className="reveal-card card-three"><MiniPlatformCard type="workshop"/></div></div>
          <div className="reveal-foot">Illustrative product preview — access to the live platform depends on the alpha program.</div>
        </div>
        <div className="portal-fabric-screen" aria-hidden="true"><div className="screen-woven-pattern"/><div className="screen-thread"/></div>
      </div>
    </section>
  );
}
