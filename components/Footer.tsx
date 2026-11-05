import Link from "next/link";
import { Brand } from "@/components/Brand";
import { PortalLink } from "@/components/PortalLink";

export function Footer() {
  return <footer className="site-footer"><div className="container-wide footer-main"><div className="footer-brand"><Brand/><p>Weaving connections.<br/>Creating impact.</p></div><div className="footer-links"><div><strong>Discover</strong><Link href="/#overview">Overview</Link><Link href="/#platform">The platform</Link><Link href="/#program">The First Thread</Link></div><div><strong>Get involved</strong><Link href="/#join">Request early access</Link><Link href="/community">Share your craft</Link><PortalLink className="footer-link" icon={false}>Explore NASJ</PortalLink></div><div><strong>Information</strong><Link href="/#faq">FAQ</Link><Link href="/privacy">Privacy notice</Link></div></div></div><div className="footer-pattern"/><div className="container-wide footer-bottom"><span>© {new Date().getFullYear()} NASJ. Made for meaningful connections.</span><span>The First Thread <span lang="ar">— الخيط الأوّل</span></span></div></footer>;
}
