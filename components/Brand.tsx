import Image from "next/image";
import Link from "next/link";

export function NasjLogo({ light = false, width = 176, className = "" }: { light?: boolean; width?: number; className?: string }) {
  return <Image className={`nasj-official-logo ${className}`} src={light ? "/brand/nasj-logo-white.png" : "/brand/nasj-logo.png"} alt="NASJ | نسج — Weaving Connections. Creating Impact." width={width} height={Math.round(width * 219 / 960)} />;
}

export function Brand({ compact = false, light = true }: { compact?: boolean; light?: boolean }) {
  return <Link href="/" className={`brand ${light ? "brand-light" : ""}`} aria-label="NASJ First Thread — home"><NasjLogo light={light} width={compact ? 176 : 220}/></Link>;
}

export function FirstThreadBadge({ subtle = false }: { subtle?: boolean }) {
  const width = subtle ? 84 : 148;
  return <span className={`thread-badge thread-badge-artwork ${subtle ? "thread-badge-subtle" : ""}`}>
    <Image src="/brand/first-thread-mascot.webp" alt="First Thread mascot badge" width={width} height={Math.round(width * 1254 / 1229)} sizes={`${width}px`} />
    <span className="thread-badge-caption">The First Thread<span className="badge-ar" lang="ar" dir="rtl">الخيط الأوّل</span></span>
  </span>;
}
