"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [setupOpen, setSetupOpen] = useState<boolean | null>(null);
  useEffect(() => { fetch("/api/setup").then((response) => response.json()).then((data) => setSetupOpen(data.setupRequired === true)).catch(() => setSetupOpen(false)); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), email: form.get("email"), password: form.get("password"), setupToken: form.get("setupToken") }) });
    const result = await response.json(); setBusy(false);
    if (!response.ok) { setError(result.error ?? "Owner account could not be created"); return; }
    router.replace("/"); router.refresh();
  }
  return <main className="auth-wrap"><section className="auth-card"><div className="brand" style={{ padding: 0, marginBottom: 24 }}><span className="brand-mark"><BriefcaseBusiness size={16} /></span>JobFlow</div><p className="eyebrow">First-run setup</p><h1 style={{ fontSize: 23, marginBottom: 8 }}>Create owner account</h1><p className="subtitle" style={{ marginBottom: 22 }}>Registration closes automatically after the first account is created.</p>
    {setupOpen === false ? <div className="panel"><strong>Owner setup is closed.</strong><p className="panel-caption">This workspace already has an account. Sign in to continue.</p><Link className="button primary" href="/login" style={{ marginTop: 12 }}>Go to sign in</Link></div> : setupOpen === null ? <p className="panel-caption">Checking setup status…</p> : <form className="form-grid" onSubmit={submit}><label className="field-label">Your name<input className="field" name="name" required minLength={2} maxLength={80} autoComplete="name" /></label><label className="field-label">Email<input className="field" name="email" type="email" required maxLength={254} autoComplete="email" /></label><label className="field-label">Password <span className="panel-caption">Use at least 12 characters.</span><input className="field" name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" /></label><label className="field-label">One-time setup token<input className="field" name="setupToken" type="password" required minLength={24} autoComplete="off" /><span className="panel-caption">Configure OWNER_SETUP_TOKEN on the server before first-run setup.</span></label><p className="toast">{error}</p><button disabled={busy} className="button primary">{busy ? "Creating account…" : "Create owner account"}</button></form>}
  </section></main>;
}
