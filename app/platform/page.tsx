import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight, ClipboardList, Gift, HeartHandshake } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { MiniPlatformCard } from "@/components/PlatformUI";

export const metadata: Metadata = { title: "NASJ Platform Tour — Concept Preview" };

export default function PlatformPage() {
  return <><SiteHeader/><main className="subpage tour-page"><div className="container"><Link href="/" className="back-link"><ArrowLeft size={16}/> Back to The First Thread</Link><div className="tour-heading"><span className="section-eyebrow gold-eyebrow">NASJ PLATFORM WORKFLOW PREVIEW</span><h1>Made for gifts<br/><em>with meaning.</em></h1><p>Explore the NASJ journey from catalog and custom requests to quotations, production and delivery. Product images and names come from the project’s demo catalog; availability is confirmed in the platform.</p><Link href="/#join" className="button button-gold">Request early access <ArrowUpRight size={16}/></Link></div><div className="tour-cards"><div><span className="tour-label"><Gift size={16}/> 01 · Discover</span><MiniPlatformCard type="catalog"/></div><div><span className="tour-label"><ClipboardList size={16}/> 02 · Request</span><MiniPlatformCard type="quote"/></div><div><span className="tour-label"><HeartHandshake size={16}/> 03 · Coordinate</span><MiniPlatformCard type="workshop"/></div></div><div className="tour-banner"><p>This is a visual product tour. Full NASJ platform access may require selection for The First Thread private alpha.</p></div></div></main><Footer/></>;
}
