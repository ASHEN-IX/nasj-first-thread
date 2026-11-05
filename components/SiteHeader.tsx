"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Brand } from "@/components/Brand";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="header-inner container-wide">
        <Brand compact />
        <nav className={`header-links ${open ? "is-open" : ""}`} aria-label="Main navigation">
          <Link href="/#overview" onClick={() => setOpen(false)}>Overview</Link>
          <Link href="/#platform" onClick={() => setOpen(false)}>The platform</Link>
          <Link href="/#program" onClick={() => setOpen(false)}>The First Thread</Link>
          <Link href="/community" onClick={() => setOpen(false)}>Craft community</Link>
          <Link href="/#faq" onClick={() => setOpen(false)}>FAQ</Link>
          <Link href="/#join" className="header-mobile-cta" onClick={() => setOpen(false)}>Request access <ArrowUpRight size={15} /></Link>
        </nav>
        <div className="header-actions"><Link className="button button-gold button-small" href="/#join">Join early access <ArrowUpRight size={15}/></Link></div>
        <button type="button" className="mobile-menu" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={23}/> : <Menu size={23}/>}</button>
      </div>
    </header>
  );
}
