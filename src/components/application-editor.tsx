"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ApplicationEditor({ applicationId, notes, response: companyResponse, interviewStatus }: { applicationId: string; notes: string | null; response: string | null; interviewStatus: string }) {
  const router = useRouter(); const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await fetch(`/api/applications/${applicationId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notes: form.get("notes"), companyResponse: form.get("companyResponse"), interviewStatus: form.get("interviewStatus") }) });
    setMessage(result.ok ? "Saved" : "Could not save"); router.refresh();
  }
  return <form onSubmit={submit} className="form-grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))", marginTop: 10 }}><input aria-label="Notes" className="field" name="notes" defaultValue={notes ?? ""} placeholder="Notes" /><input aria-label="Company response" className="field" name="companyResponse" defaultValue={companyResponse ?? ""} placeholder="Company response" /><select aria-label="Interview status" className="field" name="interviewStatus" defaultValue={interviewStatus}>{["Applied", "No response", "Recruiter screen", "Interview", "Offer", "Rejected", "Withdrawn"].map((state) => <option key={state}>{state}</option>)}</select><span style={{ display: "flex", gap: 8, alignItems: "center" }}><button className="small-button">Save updates</button><span className="panel-caption">{message}</span></span></form>;
}
