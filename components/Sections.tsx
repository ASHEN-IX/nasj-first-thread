"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, Check, ClipboardList, Gift, HeartHandshake, MessageSquareText, Sparkles, Users, WandSparkles } from "lucide-react";
import { motion } from "motion/react";
import { AlphaForm } from "@/components/AlphaForm";
import { FirstThreadBadge } from "@/components/Brand";
import { CatalogScreen, ImpactPreview } from "@/components/PlatformUI";
import { PortalLink } from "@/components/PortalLink";

const fade = { initial: { opacity: 0, y: 28 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-80px" }, transition: { duration: 0.7 } } as const;

export function PlatformSection() {
  return <section id="platform" className="platform-section section"><div className="container-wide platform-grid"><motion.div {...fade} className="platform-copy"><span className="section-eyebrow">01 / THE PLATFORM</span><h2>A connected space<br/>for <em>meaningful gifting.</em></h2><p>NASJ connects companies with associations, cooperatives and women artisans—turning thoughtful gifts into real work and stronger communities.</p><ul className="check-list"><li><Check/> Discover artisan-crafted gifts</li><li><Check/> Share a brief and request a quotation</li><li><Check/> Coordinate craft, production and delivery</li><li><Check/> Keep the people behind every piece visible</li></ul><PortalLink className="text-link" icon={false}>Explore the NASJ platform <ArrowUpRight size={18}/></PortalLink></motion.div><motion.div {...fade} className="platform-showcase"><div className="showcase-halo"/><div className="showcase-catalog"><CatalogScreen/></div><div className="showcase-impact"><ImpactPreview/></div><div className="showcase-note">An illustrative look at NASJ’s product direction</div></motion.div></div></section>;
}

export function ProgramSection() {
  return <section id="program" className="program-section"><div className="program-photo"><Image src="/images/artisan-detail.jpg" alt="Close-up of an artisan embroidering a handmade piece" fill sizes="(max-width: 760px) 100vw, 50vw"/></div><div className="program-copy"><motion.div {...fade}><span className="section-eyebrow gold-eyebrow">02 / THE FIRST THREAD</span><FirstThreadBadge/><h2>Help shape <em>what comes next.</em></h2><p>Before NASJ opens more widely, we’re inviting a small group of companies, associations, and artisans to explore the early experience, test the workflows, and tell us what needs to improve.</p><div className="program-values"><div><WandSparkles/><h3>Experience early</h3><p>Explore the product before the public launch.</p></div><div><MessageSquareText/><h3>Share your feedback</h3><p>Help us make the important details work better.</p></div><div><HeartHandshake/><h3>Build with purpose</h3><p>Support a platform designed around real people.</p></div></div><Link href="/#join" className="button button-gold">Request an invitation <ArrowUpRight size={16}/></Link></motion.div></div></section>;
}

export function JourneySection() {
  return <section className="journey-section section"><div className="container-wide"><div className="journey-head"><span className="section-eyebrow">03 / YOUR JOURNEY</span><h2>Three steps.<br/><em>One shared beginning.</em></h2><p>No complicated onboarding. Tell us who you are, we’ll review applications, and selected testers can explore the alpha experience.</p></div><div className="journey-path"><span className="journey-line"/><div className="journey-step"><div className="journey-icon"><ClipboardList/></div><span className="journey-number">01 — REQUEST</span><h3>Raise your hand.</h3><p>Share who you are and what you’d like to try.</p></div><div className="journey-step"><div className="journey-icon"><Users/></div><span className="journey-number">02 — SELECTION</span><h3>Get invited.</h3><p>We review applications and invite early testers.</p></div><div className="journey-step"><div className="journey-icon"><Sparkles/></div><span className="journey-number">03 — EXPERIENCE</span><h3>Explore & shape.</h3><p>Test the platform and send your feedback.</p></div></div></div></section>;
}

export function CommunitySection() {
  return <section className="community-section"><div className="container-wide community-grid"><motion.div {...fade} className="community-visual"><div className="community-image"><Image src="/images/artisan-hands.jpg" alt="Hands creating an artisan embroidery" fill sizes="(max-width: 760px) 100vw, 550px"/></div><div className="community-visual-tag"><span>✳</span> Behind every craft is a story.</div></motion.div><motion.div {...fade} className="community-copy"><span className="section-eyebrow">04 / THE CRAFT COMMUNITY</span><h2>Are you part of<br/><em>the craft world?</em></h2><p>Whether you’re an independent artisan, a cooperative, a workshop, or an association working with handmade crafts, we’d like to learn about your work.</p><div className="community-points"><div><span><Check size={16}/></span> Tell us about your craft and expertise</div><div><span><Check size={16}/></span> Help us understand the people and organizations in the ecosystem</div><div><span><Check size={16}/></span> Opt in to being contacted about possible opportunities</div></div><Link href="/community" className="button button-dark">Share your craft <ArrowUpRight size={17}/></Link><p className="community-disclaimer">Open to everyone in the artisan ecosystem. No alpha invitation required.</p></motion.div></div></section>;
}

export function JoinSection() {
  return <section id="join" className="join-section"><div className="join-motif left"/><div className="join-motif right"/><div className="container-wide join-grid"><motion.div {...fade} className="join-copy"><span className="section-eyebrow gold-eyebrow">05 / YOUR INVITATION</span><h2>Ready to weave<br/><em>the first thread?</em></h2><p>Request private alpha access and be among the first to help us shape the NASJ experience.</p><div className="join-divider"/><div className="join-note"><div className="join-note-icon"><Gift size={24}/></div><p>Not joining as an alpha tester? <Link href="/community">Share information about your artisan work instead. <ArrowRight size={15}/></Link></p></div></motion.div><AlphaForm/></div></section>;
}

export function FaqSection() {
  const faqs = [
    {q: "What is The First Thread?", a: "The First Thread is NASJ's private pre-launch testing program. Selected participants will be invited to explore the early platform and share product feedback."},
    {q: "Who can request early access?", a: "Companies, associations, cooperatives, artisans, and people interested in NASJ can apply. Invitation decisions depend on testing needs and available onboarding capacity."},
    {q: "Is an application an invitation?", a: "No. We review applications and may contact you with an invitation or follow-up questions. Submitting a form does not create a platform account."},
    {q: "I'm an artisan but don't want to test software. Can I still participate?", a: "Yes. Use the separate open craft-community form to tell us about your work. That form is not an alpha application and does not require an invitation."},
    {q: "Can I browse the main platform?", a: "The Explore NASJ link opens the configured main platform, or an illustrative local tour if no destination has been configured. Some features may require an alpha invitation."},
  ];
  return <section id="faq" className="faq-section section"><div className="container faq-grid"><div><span className="section-eyebrow">GOOD TO KNOW</span><h2>A few things<br/><em>worth knowing.</em></h2><p>Clear answers about the pre-launch program and the two ways to get involved.</p></div><div className="faq-items">{faqs.map((faq,i) => <details key={faq.q} open={i===0}><summary>{faq.q}<span>+</span></summary><p>{faq.a}</p></details>)}</div></div></section>;
}
