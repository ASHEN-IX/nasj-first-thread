"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";

const craftCategories = [
  { value: "embroidery", label: "Embroidery" }, { value: "weaving", label: "Textile weaving" },
  { value: "basketry", label: "Basketry" }, { value: "pottery", label: "Pottery" },
  { value: "jewelry", label: "Jewelry" }, { value: "woodwork", label: "Woodwork" },
  { value: "leather", label: "Leatherwork" }, { value: "other", label: "Other craft" },
] as const;

export function CraftForm() {
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ kind: "idle" | "success" | "error"; message: string }>({ kind: "idle", message: "" });
  const [selected, setSelected] = useState<string[]>([]);
  function toggleCraft(value: string) { setSelected((previous) => previous.includes(value) ? previous.filter((v) => v !== value) : [...previous, value]); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected.length) { setStatus({ kind: "error", message: "Please select at least one craft area." }); return; }
    const form = event.currentTarget;
    const raw = new FormData(form);
    setPending(true); setStatus({ kind: "idle", message: "" });
    const payload = {
      contactName: raw.get("contactName"), email: raw.get("email"), phone: raw.get("phone"),
      organizationName: raw.get("organizationName"), participantType: raw.get("participantType"),
      region: raw.get("region"), craftTypes: selected, aboutWork: raw.get("aboutWork"),
      websiteUrl: raw.get("websiteUrl"), openToCollaboration: raw.get("openToCollaboration") === "on",
      consent: raw.get("consent") === "on", website: raw.get("website"),
    };
    try {
      const response = await fetch("/api/craft-community", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result: { ok: boolean; message: string } = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "Please try again.");
      setStatus({ kind: "success", message: "Thank you for sharing your craft. Your information has been received for review; we'll contact you if there is a relevant opportunity." });
      form.reset(); setSelected([]);
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Something went wrong." });
    } finally { setPending(false); }
  }
  return (
    <form className="form-card craft-form" onSubmit={submit}>
      <div className="form-title"><div><span className="form-kicker">OPEN COMMUNITY INTEREST FORM</span><h3>Tell us about your craft.</h3></div><div className="form-stamp">02 / 02</div></div>
      <div className="form-grid">
        <label>Contact name <span>*</span><input name="contactName" autoComplete="name" placeholder="Name of the contact person" minLength={2} maxLength={120} required /></label>
        <label>Email address <span>*</span><input name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} required /></label>
        <label>Who are you? <span>*</span><select name="participantType" defaultValue="" required><option value="" disabled>Choose the best fit</option><option value="artisan">Independent artisan</option><option value="cooperative">Cooperative</option><option value="association">Association</option><option value="workshop">Artisan workshop</option><option value="craft_business">Craft business</option><option value="community_member">Community member / sharing a craft</option><option value="other">Other</option></select></label>
        <label>City or region <span>*</span><input name="region" placeholder="e.g. Kairouan, Tunis, Nabeul…" minLength={2} maxLength={120} required /></label>
        <label>Organization / workshop <em>(optional)</em><input name="organizationName" placeholder="Name of your association or workshop" maxLength={160}/></label>
        <label>Phone or WhatsApp <em>(optional)</em><input name="phone" type="tel" autoComplete="tel" placeholder="+216 …" maxLength={40}/></label>
        <fieldset className="full craft-fieldset"><legend>Your craft areas <span>*</span></legend><div className="craft-checks">{craftCategories.map((craft) => <label key={craft.value} className={`craft-chip ${selected.includes(craft.value) ? "selected" : ""}`}><input type="checkbox" checked={selected.includes(craft.value)} onChange={() => toggleCraft(craft.value)}/>{craft.label}</label>)}</div></fieldset>
        <label className="full">Tell us about your work <span>*</span><textarea name="aboutWork" rows={4} minLength={15} maxLength={2000} placeholder="What do you create? How do you work? What would you like people to know about your craft?" required/></label>
        <label className="full">Website or public portfolio <em>(optional)</em><input name="websiteUrl" type="url" placeholder="https://…" maxLength={300}/></label>
      </div>
      <div className="honeypot" aria-hidden="true"><label htmlFor="craft-website">Leave empty</label><input id="craft-website" name="website" tabIndex={-1} autoComplete="off"/></div>
      <label className="consent-row"><input type="checkbox" name="openToCollaboration"/><span>I would like NASJ to contact me about potential craft collaborations.</span></label>
      <label className="consent-row"><input type="checkbox" name="consent" required/><span>I agree to NASJ storing these details to review this community submission and contact me about it. My information will not be published through this form. See the <Link href="/privacy">privacy notice</Link>.</span></label>
      <button type="submit" disabled={pending} className="button button-dark form-submit">{pending ? <LoaderCircle size={18} className="spin"/> : <ArrowRight size={18}/>} {pending ? "Submitting…" : "Share your craft"}</button>
      {status.kind !== "idle" && <div role="status" className={`form-feedback ${status.kind}`}>{status.kind === "success" && <CheckCircle2 size={18}/>} {status.message}</div>}
      <div className="form-assurance"><ShieldCheck size={14}/> Open to the wider craft community and people sharing public craft information. Please do not submit someone else’s private contact details without permission.</div>
    </form>
  );
}
