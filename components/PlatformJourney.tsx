"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, Check, ClipboardList, Gift, Layers3 } from "lucide-react";
import { MiniPlatformCard } from "@/components/PlatformUI";

const steps = [
  { id: "catalog", title: "Discover", icon: Gift, caption: "Browse craft, material and story.", detail: "Explore a sample catalog of embroidery, basketry and pottery. Each piece begins with the people who make it." },
  { id: "quote", title: "Request", icon: ClipboardList, caption: "Turn an idea into a clear brief.", detail: "A gift request brings together your occasion, quantities and timing, ready for a quotation conversation." },
  { id: "workshop", title: "Coordinate", icon: Layers3, caption: "Keep the craft connected.", detail: "Illustrative production stages connect a reviewed request, artisan participation and progress through the workshop." },
] as const;

export function PlatformJourney() {
  const [selected, setSelected] = useState(0);
  const id = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % steps.length;
    else if (event.key === "ArrowLeft") next = (index + steps.length - 1) % steps.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = steps.length - 1;
    else return;
    event.preventDefault(); setSelected(next); tabs.current[next]?.focus();
  }
  const current = steps[selected];
  return <div className="platform-journey">
    <div className="journey-demo-label"><span/> ILLUSTRATIVE EXPERIENCE</div>
    <div role="tablist" aria-label="Explore the NASJ journey" className="journey-tabs">
      {steps.map((step, index) => <button key={step.id} id={`${id}-tab-${index}`} type="button" role="tab" aria-selected={selected === index} aria-controls={`${id}-panel-${index}`} tabIndex={selected === index ? 0 : -1} onClick={() => setSelected(index)} onKeyDown={event => keyboard(event, index)} ref={element => { tabs.current[index] = element; }}><step.icon size={15}/><span>{step.title}</span></button>)}
    </div>
    {steps.map((step, index) => <div key={step.id} id={`${id}-panel-${index}`} role="tabpanel" aria-labelledby={`${id}-tab-${index}`} hidden={selected !== index} tabIndex={0} className="journey-panel">
      <MiniPlatformCard type={step.id}/>
      <div className="journey-panel-copy"><span>0{index + 1} / THE NASJ JOURNEY</span><h3>{step.caption}</h3><p>{step.detail}</p></div>
    </div>)}
    <div className="journey-demo-footer"><span><Check size={13}/> Concept walkthrough</span><button type="button" onClick={() => setSelected((selected + 1) % steps.length)} aria-label={`Next preview after ${current.title}`}>Next step <ArrowRight size={14}/></button></div>
  </div>;
}
