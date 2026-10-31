"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { SearchProfile, Source } from "@prisma/client";

export function ProfileEditor({ profile, sources }: { profile: SearchProfile; sources: Source[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSaved(false);
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name")),
      keywords: String(form.get("keywords")).split("\n").map((item) => item.trim()).filter(Boolean),
      excludedKeywords: String(form.get("excludedKeywords")).split("\n").map((item) => item.trim()).filter(Boolean),
      experienceMin: Number(form.get("experienceMin")),
      experienceMax: Number(form.get("experienceMax")),
      location: String(form.get("location")),
      enabled: form.get("enabled") === "on",
      enabledSources: sources.filter((source) => form.get(`source:${source.key}`) === "on").map((source) => source.key),
    };
    const response = await fetch(`/api/search-profiles/${profile.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "Could not save profile"); return; }
    setSaved(true); router.refresh();
  }
  return <form className="form-grid" onSubmit={submit}>
    <label className="field-label">Profile name<input className="field" name="name" defaultValue={profile.name} maxLength={80} required /></label>
    <label className="field-label">Search keywords <span className="panel-caption">One term per line. Keywords are matched against title and description.</span><textarea className="field" rows={9} name="keywords" defaultValue={profile.keywords.join("\n")} required /></label>
    <label className="field-label">Excluded keywords <span className="panel-caption">One term per line.</span><textarea className="field" rows={3} name="excludedKeywords" defaultValue={profile.excludedKeywords.join("\n")} /></label>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><label className="field-label">Minimum experience (years)<input className="field" name="experienceMin" type="number" min="0" max="20" defaultValue={profile.experienceMin} /></label><label className="field-label">Maximum experience (years)<input className="field" name="experienceMax" type="number" min="0" max="40" defaultValue={profile.experienceMax} /></label></div>
    <label className="field-label">Location<input className="field" name="location" defaultValue={profile.location} /></label>
    <label className="field-label" style={{ display: "flex", alignItems: "center", flexDirection: "row", gap: 8 }}><input type="checkbox" name="enabled" defaultChecked={profile.enabled} /> Profile enabled</label>
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend className="field-label" style={{ marginBottom: 9 }}>Sources</legend>{sources.map((source) => <label key={source.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11, color: "#59665f", padding: "5px 0" }}><input type="checkbox" name={`source:${source.key}`} defaultChecked={profile.enabledSources.includes(source.key)} disabled={!source.enabled || source.adapterStatus === "UNAVAILABLE"} />{source.name}<span className="panel-caption">{source.adapterStatus.toLowerCase().replaceAll("_", " ")}</span></label>)}</fieldset>
    <p className="toast">{error || (saved ? "Profile settings saved" : "")}</p>
    <button className="button primary" type="submit">Save profile</button>
  </form>;
}
