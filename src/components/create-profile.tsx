"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function CreateProfile() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/search-profiles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), keywords: String(form.get("keywords")).split("\n").map((term) => term.trim()).filter(Boolean) }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "Could not create profile"); return; }
    router.push(`/profiles/${result.profile.slug}`); router.refresh();
  }
  return <form className="form-grid" onSubmit={submit}><label className="field-label">Profile name<input className="field" name="name" required maxLength={80} placeholder="e.g. UX Designer" /></label><label className="field-label">Search keywords <span className="panel-caption">One term per line</span><textarea className="field" name="keywords" rows={6} required placeholder={"UX Designer\nJunior Product Designer"} /></label><p className="toast">{error}</p><button className="button primary">Create profile</button></form>;
}
