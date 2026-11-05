import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowLeft, HeartHandshake, Sprout, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { CraftForm } from "@/components/CraftForm";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = { title: "Share your craft — NASJ", description: "Tell NASJ about your artisan work, workshop, association or cooperative. Open community interest form." };

export default function CommunityPage() {
  return <><SiteHeader/><main className="subpage craft-page"><div className="container-wide craft-page-grid"><div className="craft-page-copy"><Link href="/" className="back-link"><ArrowLeft size={16}/> Back to First Thread</Link><span className="section-eyebrow gold-eyebrow">NASJ / OPEN CRAFT COMMUNITY</span><h1>Every craft<br/>has a <em>story.</em></h1><p>We want to understand the people and organizations keeping craftsmanship alive. Whether you work independently or as a team, tell us about what you create.</p><div className="craft-page-photo"><Image src="/images/artisan-hands.jpg" alt="Artisan making traditional handmade embroidery" fill sizes="550px"/></div><div className="subpage-points"><span><HeartHandshake/> People before processes</span><span><Sprout/> A more connected artisan ecosystem</span><span><ShieldCheck/> Your information stays private</span></div></div><CraftForm/></div></main><Footer/></>;
}
