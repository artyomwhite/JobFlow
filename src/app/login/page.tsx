"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { BriefcaseBusiness } from "lucide-react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    const result = await authClient.signIn.email({ email: String(data.get("email")), password: String(data.get("password")), callbackURL: "/" });
    setBusy(false);
    if (result.error) { setError(result.error.message ?? "Could not sign in"); return; }
    const from = params.get("from");
    router.replace(from?.startsWith("/") ? from : "/");
  }
  return <form className="form-grid" onSubmit={submit}>
    <label className="field-label">Email<input autoFocus required name="email" type="email" className="field" autoComplete="username" /></label>
    <label className="field-label">Password<input required name="password" type="password" className="field" autoComplete="current-password" /></label>
    <p className="toast">{error}</p>
    <button disabled={busy} className="button primary" type="submit">{busy ? "Signing in…" : "Sign in"}</button>
  </form>;
}

export default function LoginPage() {
  return <main className="auth-wrap"><section className="auth-card">
    <div className="brand" style={{ padding: 0, marginBottom: 24 }}><span className="brand-mark"><BriefcaseBusiness size={16} /></span>JobFlow</div>
    <p className="eyebrow">Your private job workspace</p><h1 style={{ fontSize: 23, marginBottom: 8 }}>Welcome back</h1>
    <p className="subtitle" style={{ marginBottom: 22 }}>Sign in to continue to your dashboard.</p>
    <Suspense><LoginForm /></Suspense>
    <p className="panel-caption" style={{ marginTop: 18 }}>First time? <Link href="/register" style={{ color: "#286651", fontWeight: 700 }}>Set up the owner account</Link></p>
  </section></main>;
}
