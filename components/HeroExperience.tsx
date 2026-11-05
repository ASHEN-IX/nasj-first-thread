"use client";

import { useRef } from "react";
import { ArrowDown, ArrowUpRight, Gift, HeartHandshake, Layers3, Play, Sprout } from "lucide-react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { FirstThreadBadge } from "@/components/Brand";
import { CatalogScreen, RequestScreen } from "@/components/PlatformUI";
import { PortalLink } from "@/components/PortalLink";
import { FabricSequence, type FabricSequenceHandle } from "@/components/FabricSequence";
import { canPlayFabric } from "@/lib/fabric";
import { PlatformJourney } from "@/components/PlatformJourney";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function HeroExperience() {
  const scene = useRef<HTMLElement>(null);
  const fabric = useRef<FabricSequenceHandle>(null);
  const approachingFabric = useRef<FabricSequenceHandle>(null);

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(min-width: 1024px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)", () => {
      if (!canPlayFabric() || !scene.current) return;
      const root = scene.current;
      root.dataset.cinematic = "true";
      const scoped = gsap.utils.selector(scene);
      const frames = { progress: 0 };
      const closeupFrames = { progress: 0 };
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { id: "nasj-fabric", trigger: root, pin: true, start: "top top", end: "+=200%", scrub: .6, anticipatePin: 1, invalidateOnRefresh: true },
      });
      // Keep the approved opening and approach. End at coverage, then unpin.
      // There is no pinned hold or sideways/return animation after this endpoint.
      tl.to(frames, { progress: 1, duration: .48, onUpdate: () => fabric.current?.seek(frames.progress) }, 0)
        .to(scoped(".fabric-piece"), { y: -80, x: -35, rotateZ: -5, scale: 1.2, duration: .38 }, .08)
        .to(scoped(".hero-catalog"), { y: -48, rotateZ: -1, rotateY: 5, duration: .4 }, .12)
        .to(scoped(".hero-request"), { y: 20, x: 15, rotateZ: 12, duration: .4 }, .12)
        .to(scoped(".thread-path"), { strokeDashoffset: -145, duration: .69 }, 0)
        .to(scoped(".hero-copy"), { y: -35, autoAlpha: 0, duration: .18 }, .34)
        .to(scoped(".hero-benefits, .hero-scroll"), { autoAlpha: 0, duration: .16 }, .34)
        .to(scoped(".fabric-piece"), { autoAlpha: 0, duration: .08 }, .46)
        .fromTo(scoped(".scroll-fabric-wipe"), { autoAlpha: 0 }, { autoAlpha: 1, duration: .04 }, .42)
        .to(closeupFrames, { progress: 1, duration: .25, onUpdate: () => approachingFabric.current?.seek(closeupFrames.progress) }, .44)
        .fromTo(scoped(".scroll-fabric-motion"), { scale: 1, yPercent: 6 }, { scale: 1.12, yPercent: 0, duration: .25 }, .44)
        .to(scoped(".scroll-fabric-cover"), { opacity: 1, duration: .02 }, .67);
      return () => {
        tl.scrollTrigger?.kill(); tl.kill(); delete root.dataset.cinematic;
        fabric.current?.seek(0); approachingFabric.current?.seek(0);
      };
    });
    return () => media.revert();
  }, { scope: scene });

  return (
    <><section id="overview" ref={scene} className="hero-stage" aria-label="Introducing NASJ First Thread">
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
            <svg className="golden-thread" viewBox="0 0 800 580" fill="none" aria-hidden="true"><path className="thread-halo" d="M 48 450 C -60 240 155 70 462 65 C 794 60 825 385 618 463 C 370 559 120 341 252 245"/><path className="thread-path" d="M 48 450 C -60 240 155 70 462 65 C 794 60 825 385 618 463 C 370 559 120 341 252 245"/><path className="thread-fine" d="M 0 510 C 220 578 690 432 800 180"/></svg>
            <div className="hero-catalog"><CatalogScreen /></div>
            <div className="hero-request"><RequestScreen /></div>
            <div className="fabric-piece"><FabricSequence ref={fabric}/><PortalLink className="fabric-entry" icon={false} ariaLabel="Explore NASJ through the embroidered fabric"><span className="fabric-hint">Follow the thread <ArrowUpRight size={14}/></span></PortalLink></div>
            <div className="hero-visual-label">A platform for gifts with a story. <span>↗</span></div>
          </div>
        </div>
        <div className="hero-bottom container-wide"><div className="hero-benefits"><div><Gift/><span><strong>Meaningful gifts</strong><small>Thoughtful and handmade</small></span></div><div><HeartHandshake/><span><strong>Real opportunities</strong><small>For women artisans</small></span></div><div><Layers3/><span><strong>One connected space</strong><small>From request to delivery</small></span></div><div><Sprout/><span><strong>Lasting impact</strong><small>Made with communities</small></span></div></div><div className="hero-scroll"><ArrowDown size={15}/> Scroll to discover</div></div>

        <div className="scroll-fabric-wipe" aria-hidden="true"><div className="scroll-fabric-motion"><FabricSequence kind="portal" ref={approachingFabric}/><div className="scroll-fabric-cover"/></div></div>
      </div>
    </section>
        <div className="portal-reveal" aria-label="NASJ platform tour">
          <div className="reveal-overline">A LOOK INSIDE NASJ <span>✳</span> THE MAIN PLATFORM</div>
          <div className="reveal-text"><span className="section-eyebrow">THE PLATFORM</span><h2>One idea.<br/><em>Many connections.</em></h2><p>Explore how NASJ brings companies, cooperatives, and artisans into one thoughtful gifting journey.</p><PortalLink className="button button-dark button-hero">Explore NASJ</PortalLink></div>
          <PlatformJourney/>
          <div className="reveal-foot">Illustrative product preview — access to the live platform depends on the alpha program.</div>
        </div>
    </>
  );
}
