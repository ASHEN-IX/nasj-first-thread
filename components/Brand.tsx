import Link from "next/link";

export function NasjMark({ className = "", size = 42 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M9 49V15l14 13 18-17 14 6v32L42 36 23 53 9 49Z" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
      <path d="m9 15 33 35 13-1M9 49 43 11" stroke="#D6AE69" strokeWidth="5.5" strokeLinecap="round" />
      <path d="m23 28 19 22M23 53 9 39" stroke="#BD693F" strokeWidth="5.5" strokeLinecap="round" />
    </svg>
  );
}

export function Brand({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <Link href="/" className={`brand ${light ? "brand-light" : ""}`} aria-label="NASJ First Thread — home">
      <NasjMark size={compact ? 34 : 42} />
      <span className="brand-type"><strong>NASJ <span lang="ar">نسج</span></strong>{!compact && <small>Weaving opportunities. Creating impact.</small>}</span>
    </Link>
  );
}

export function FirstThreadBadge({ subtle = false }: { subtle?: boolean }) {
  return (
    <span className={`thread-badge ${subtle ? "thread-badge-subtle" : ""}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 5h10M7 19h10M9 5v14M15 5v14M9 8h6M9 12h6M9 16h6" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round"/>
        <path d="M17 19c3 0 4 1 4 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
      <span>The First Thread <span className="badge-ar" lang="ar">· الخيط الأوّل</span></span>
    </span>
  );
}
