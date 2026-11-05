"use client";

import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { platformDestination, usePortal } from "@/components/PortalProvider";

export function PortalLink({ children = "Explore NASJ", className = "button button-dark", icon = true, ariaLabel }: { children?: ReactNode; className?: string; icon?: boolean; ariaLabel?: string }) {
  const { busy, prepare, enter } = usePortal();
  return <a href={platformDestination} onClick={enter} onPointerEnter={prepare} onFocus={prepare} className={className} aria-label={ariaLabel} aria-busy={busy}>
    {children} {icon && <ArrowUpRight size={17}/>}
  </a>;
}
