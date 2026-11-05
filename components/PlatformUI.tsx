import Image from "next/image";
import { ArrowRight, Check, ClipboardList, Gift, Heart, Layers3, Package, Search, Sparkles, TrendingUp, Users, Workflow } from "lucide-react";

export function CatalogScreen({ className = "" }: { className?: string }) {
  return (
    <div className={`platform-window ${className}`}>
      <div className="window-chrome"><div className="traffic-lights"><i/><i/><i/></div><span>NASJ · Gift catalog</span><div className="window-tag">CONCEPT PREVIEW</div></div>
      <div className="app-shell">
        <aside className="app-sidebar"><div className="app-logo">N<span>✳</span></div><div className="side-item is-active"><Gift size={16} /> <span>Catalog</span></div><div className="side-item"><ClipboardList size={16} /><span>Requests</span></div><div className="side-item"><Package size={16}/><span>Production</span></div><div className="side-item"><Users size={16}/><span>Community</span></div></aside>
        <div className="app-content"><div className="app-topline"><span className="app-crumb">Discover / Handcrafted gifts</span><Search size={15}/></div><div className="app-heading"><div><small>HANDMADE, WITH MEANING</small><h3>Gifts with a<br/><em>real story.</em></h3></div><div className="app-squiggle">⌁</div></div><div className="product-filters"><span>All crafts</span><span>Embroidery</span><span>Basketry</span><span>Pottery</span></div><div className="product-row"><div className="product-thumb textile"><Image src="/images/product-embroidered.jpg" alt="Embroidered cushion sample" fill sizes="110px" /></div><div className="product-thumb basket"><Image src="/images/product-basket.jpg" alt="Woven basket sample" fill sizes="110px" /></div><div className="product-thumb mug"><Image src="/images/product-pottery.jpg" alt="Ceramic cup sample" fill sizes="110px" /></div></div><div className="product-captions"><span>Embroidered pieces</span><span>Woven baskets</span><span>Artisan pottery</span></div></div>
      </div>
    </div>
  );
}

export function RequestScreen({ className = "" }: { className?: string }) {
  return (
    <div className={`request-window ${className}`}>
      <div className="request-header"><span>NASJ <span lang="ar">نسج</span></span><span className="request-dot"/></div>
      <div className="request-photo"><Image src="/images/artisan-hands.jpg" fill sizes="250px" alt="Artisan making a traditional piece by hand"/></div>
      <h4>From your brief<br/><em>to their craft.</em></h4>
      <p>One connected journey</p>
      <div className="request-check"><Check size={12}/> Share your brief</div>
      <div className="request-check"><Check size={12}/> Made by artisans</div>
      <div className="request-check"><Check size={12}/> Quality & delivery</div>
    </div>
  );
}

export function ImpactPreview({ className = "" }: { className?: string }) {
  return (
    <div className={`impact-preview ${className}`}><div className="impact-icon"><Workflow size={19}/></div><small>A connected journey</small><strong>One request.<br/>Many meaningful connections.</strong><div className="impact-flow"><span><Gift size={14}/> Company</span><ArrowRight size={14}/><span><Users size={14}/> Association</span><ArrowRight size={14}/><span><Heart size={14}/> Artisan</span></div><div className="impact-foot"><Sparkles size={13}/> Built around people, not generic gifts.</div></div>
  );
}

export function MiniPlatformCard({ type }: { type: "catalog" | "quote" | "workshop" }) {
  if (type === "catalog") return <div className="mini-ui mini-ui-catalog"><div className="mini-ui-top"><span className="mini-dot"/> NASJ / Catalog <Search size={13}/></div><strong>Find something meaningful.</strong><div className="mini-products"><div><Image src="/images/product-embroidered.jpg" fill alt="Embroidery product sample" sizes="110px" /></div><div className="mini-basket"><Image src="/images/product-basket.jpg" fill alt="Basket product sample" sizes="110px" /></div><div className="mini-clay"><Image src="/images/product-pottery.jpg" fill alt="Pottery product sample" sizes="110px" /></div></div><small>Crafts, stories and thoughtful gifting</small></div>;
  if (type === "quote") return <div className="mini-ui mini-ui-quote"><div className="mini-ui-top">NASJ / Gift request <ClipboardList size={13}/></div><strong>Tell us what you need.</strong><span className="mini-line long"/><span className="mini-line"/><div className="mini-progress"><Check size={14}/> Your brief, clearly captured</div><span className="mini-action">Continue request <ArrowRight size={12}/></span></div>;
  return <div className="mini-ui mini-ui-workshop"><div className="mini-ui-top">NASJ / Craft coordination <Layers3 size={13}/></div><strong>Made by human hands.</strong><div className="mini-process"><div><Check size={12}/> Request reviewed</div><div><Check size={12}/> Artisans choose</div><div><TrendingUp size={12}/> Production tracked</div></div><small>Consent and transparent coordination</small></div>;
}
