import Image from "next/image";
import { NasjLogo } from "@/components/Brand";
import { platformProducts } from "@/lib/platform-content";
import { ArrowRight, Check, ClipboardList, Gift, Heart, Layers3, Package, Search, ShoppingCart, Sparkles, TrendingUp, Users, Workflow } from "lucide-react";

export function CatalogScreen({ className = "" }: { className?: string }) {
  return (
    <div className={`platform-window ${className}`}>
      <div className="window-chrome"><div className="traffic-lights"><i/><i/><i/></div><span>NASJ · Gift catalog</span><div className="window-tag">PLATFORM PREVIEW</div></div>
      <div className="app-shell">
        <aside className="app-sidebar"><div className="app-logo"><NasjLogo light width={96}/></div><div className="side-item is-active"><Gift size={16} /> <span>Catalog</span></div><div className="side-item"><ShoppingCart size={16} /><span>Cart</span></div><div className="side-item"><ClipboardList size={16}/><span>Custom request</span></div><div className="side-item"><Package size={16}/><span>Orders</span></div></aside>
        <div className="app-content"><div className="app-topline"><span className="app-crumb">Catalog / Handmade gifts</span><Search size={15}/></div><div className="app-heading"><div><small>MADE BY WOMEN ARTISANS</small><h3>Gifts with a<br/><em>real story.</em></h3></div><div className="app-squiggle">⌁</div></div><div className="product-filters"><span>All crafts</span><span>Weaving</span><span>Basket making</span><span>Pottery</span></div><div className="product-row">{platformProducts.map(product => <div key={product.id} className="product-thumb"><Image src={product.image} alt={product.alt} fill sizes="(max-width: 620px) 100px, 160px"/></div>)}</div><div className="product-captions">{platformProducts.map(product => <span key={product.id}>{product.name}</span>)}</div><div className="catalog-provenance">NASJ project examples · quotation & availability to confirm</div></div>
      </div>
    </div>
  );
}

export function RequestScreen({ className = "" }: { className?: string }) {
  return (
    <div className={`request-window ${className}`}>
      <div className="request-header"><NasjLogo width={110}/><span className="request-dot"/></div>
      <div className="request-photo"><Image src="/platform/gift-basket.webp" fill sizes="250px" alt="Woven gift basket from the NASJ project demo catalog"/></div>
      <h4>From your brief<br/><em>to their craft.</em></h4>
      <p>Custom request · project preview</p>
      <div className="request-check"><Check size={12}/> Add your reference photo</div>
      <div className="request-check"><Check size={12}/> Set quantity & needed-by date</div>
      <div className="request-check"><Check size={12}/> Review NASJ’s quotation</div>
    </div>
  );
}

export function ImpactPreview({ className = "" }: { className?: string }) {
  return (
    <div className={`impact-preview ${className}`}><div className="impact-icon"><Workflow size={19}/></div><small>NASJ coordinates the journey</small><strong>A clear quotation.<br/>A connected order.</strong><div className="impact-flow"><span><Gift size={14}/> Company</span><ArrowRight size={14}/><span>NASJ</span><ArrowRight size={14}/><span><Users size={14}/> Association</span><ArrowRight size={14}/><span><Heart size={14}/> Artisan</span></div><div className="impact-foot"><Sparkles size={13}/> Artisans choose. NASJ follows quality & delivery.</div></div>
  );
}

export function MiniPlatformCard({ type }: { type: "catalog" | "quote" | "workshop" }) {
  if (type === "catalog") return <div className="mini-ui mini-ui-catalog"><div className="mini-ui-top"><span className="mini-dot"/> NASJ / Catalog <Search size={13}/></div><strong>Find something meaningful.</strong><div className="mini-products">{platformProducts.map(product => <div key={product.id}><Image src={product.image} fill alt={product.alt} sizes="(max-width: 620px) 90px, 140px"/></div>)}</div><small>Project examples · weaving, basket making & pottery</small></div>;
  if (type === "quote") return <div className="mini-ui mini-ui-quote"><div className="mini-ui-top">NASJ / Gift request <ClipboardList size={13}/></div><strong>Tell us what you need.</strong><span className="mini-field">Product description & reference photo</span><span className="mini-field">Quantity · Needed by</span><div className="mini-progress"><Check size={14}/> Review the quotation before work starts</div><span className="mini-action">Custom request preview <ArrowRight size={12}/></span></div>;
  return <div className="mini-ui mini-ui-workshop"><div className="mini-ui-top">NASJ / Craft coordination <Layers3 size={13}/></div><strong>Made by human hands.</strong><div className="mini-process"><div><Check size={12}/> Association accepts</div><div><Check size={12}/> Artisans working</div><div><TrendingUp size={12}/> Quality checked at NASJ</div></div><small>Production, quality and delivery handovers</small></div>;
}
