"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ActionType } from "@prisma/client";

const actions: { key: ActionType; label: string; hotkey: string }[] = [
  { key: "SAVED", label: "Save", hotkey: "S" }, { key: "APPLIED", label: "Applied", hotkey: "A" },
  { key: "SKIPPED", label: "Skip", hotkey: "K" }, { key: "LATER", label: "Later", hotkey: "L" },
];

export function JobActions({ jobId, profileId, originalUrl, markViewedOnMount = false, enableHotkeys = false }: { jobId: string; profileId: string; originalUrl: string; markViewedOnMount?: boolean; enableHotkeys?: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const act = useCallback(async (actionType: ActionType) => {
    const response = await fetch(`/api/jobs/${jobId}/actions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId, actionType }) });
    if (!response.ok) { setMessage("Action could not be saved"); return; }
    setMessage(actionType === "APPLIED" ? "Application recorded" : "Saved"); router.refresh();
  }, [jobId, profileId, router]);
  useEffect(() => {
    if (!enableHotkeys) return;
    function keydown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "")) return;
      const key = event.key.toUpperCase();
      const action = actions.find((entry) => entry.hotkey === key);
      if (action) { event.preventDefault(); void act(action.key); }
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [act, enableHotkeys]);
  useEffect(() => {
    if (!markViewedOnMount) return;
    const key = `jobflow:viewed:${profileId}:${jobId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void fetch(`/api/jobs/${jobId}/actions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId, actionType: "VIEWED" }) });
  }, [jobId, markViewedOnMount, profileId]);
  async function openOriginal() {
    window.open(originalUrl, "_blank", "noopener,noreferrer");
    await fetch(`/api/jobs/${jobId}/actions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId, actionType: "OPENED" }) });
    router.refresh();
  }
  return <div><div className="job-actions"><button className="small-button" onClick={openOriginal}>Open original ↗</button>{actions.map(({ key, label, hotkey }) => <button key={key} className="small-button" onClick={() => void act(key)}>{label} <span style={{ opacity: .55 }}>{hotkey}</span></button>)}</div>{message && <div className="panel-caption" style={{ marginTop: 8 }}>{message}</div>}</div>;
}
