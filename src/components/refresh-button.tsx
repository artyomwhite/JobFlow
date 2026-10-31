"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";

export function RefreshButton({ profileSlug }: { profileSlug?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function refresh() {
    setBusy(true); setMessage("");
    const response = await fetch("/api/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profileSlug ? { profileSlug } : {}) });
    const result = await response.json();
    setBusy(false);
    setMessage(response.ok ? `${result.jobsAdded ?? 0} new` : result.error ?? "Sync failed");
    router.refresh();
  }
  return <div style={{ display: "flex", alignItems: "center", gap: 9 }}><button disabled={busy} onClick={refresh} className="button primary"><RefreshCw size={13} className={busy ? "animate-spin" : ""} />{busy ? "Refreshing…" : profileSlug ? "Refresh profile" : "Refresh all profiles"}</button>{message && <span className="panel-caption">{message}</span>}</div>;
}
