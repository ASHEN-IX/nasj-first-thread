"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";

type Status = { kind: "idle" | "success" | "error"; message: string };

export function AlphaForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true); setStatus({ kind: "idle", message: "" });
    const raw = new FormData(form);
    const payload = {
      fullName: raw.get("fullName"), email: raw.get("email"), role: raw.get("role"),
      organization: raw.get("organization"), location: raw.get("location"),
      testingInterest: raw.get("testingInterest"), consent: raw.get("consent") === "on",
      website: raw.get("website"),
    };
    try {
      const response = await fetch("/api/early-access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result: { ok: boolean; message: string } = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "Please try again.");
      setStatus({ kind: "success", message: "Your thread is in place. We'll reach out if you're selected for the first testing group." });
      form.reset();
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Something went wrong." });
    } finally { setPending(false); }
  }
  return (
    <motion.form onSubmit={submit} className="form-card alpha-form" initial={{ y: 18, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.55 }}>
      <div className="form-title"><div><span className="form-kicker">PRIVATE ALPHA APPLICATION</span><h3>Request your invitation.</h3></div><div className="form-stamp">01 / 02</div></div>
      <div className="form-grid">
        <label>Full name <span>*</span><input name="fullName" type="text" autoComplete="name" placeholder="Your full name" maxLength={120} minLength={2} required /></label>
        <label>Email address <span>*</span><input name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} required /></label>
        <label>Your role <span>*</span><select name="role" defaultValue="" required><option value="" disabled>Select your role</option><option value="company">Company / buyer</option><option value="association">Association / cooperative</option><option value="artisan">Artisan</option><option value="supporter">Supporter / curious explorer</option></select></label>
        <label>Organization <em>(optional)</em><input name="organization" placeholder="Your company or association" maxLength={160}/></label>
        <label className="full">City or region <em>(optional)</em><input name="location" placeholder="e.g. Tunis, Sfax, Sousse…" maxLength={120}/></label>
        <label className="full">What would you like to explore or test? <span>*</span><textarea name="testingInterest" placeholder="Tell us what interests you about NASJ and how you could help us improve it." rows={3} minLength={10} maxLength={1600} required /></label>
      </div>
      <div className="honeypot" aria-hidden="true"><label htmlFor="ft-website">Leave this field empty</label><input id="ft-website" name="website" tabIndex={-1} autoComplete="off"/></div>
      <label className="consent-row"><input type="checkbox" name="consent" required/><span>I agree to NASJ using these details to review my early-access request and contact me about the program. See the <Link href="/privacy">privacy notice</Link>.</span></label>
      <button disabled={pending} type="submit" className="button button-dark form-submit">{pending ? <LoaderCircle size={18} className="spin" /> : <ArrowRight size={18}/>} {pending ? "Submitting…" : "Join the First Thread"}</button>
      {status.kind !== "idle" && <div role="status" className={`form-feedback ${status.kind}`}>{status.kind === "success" && <CheckCircle2 size={18}/>} {status.message}</div>}
      <div className="form-assurance"><ShieldCheck size={14}/> Submitting a request does not automatically grant alpha access.</div>
    </motion.form>
  );
}
