import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Settings2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RefreshButton } from "@/components/refresh-button";
import { JobActions } from "@/components/job-actions";
import { TrackedExternalLink } from "@/components/tracked-external-link";
import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ status?: string }> }) {
  const [{ slug }, filters] = await Promise.all([params, searchParams]);
  const user = await requirePageUser();
  const [profiles, profile] = await Promise.all([db.searchProfile.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "asc" } }), db.searchProfile.findFirst({ where: { slug, ownerId: user.id } })]);
  if (!profile) notFound();
  const status = ["NEW", "VIEWED", "SAVED", "APPLIED", "SKIPPED", "LATER"].includes(filters.status ?? "") ? filters.status as "NEW" | "VIEWED" | "SAVED" | "APPLIED" | "SKIPPED" | "LATER" : undefined;
  const [matches, total, fresh, viewed, saved, applied, opened, lastSync] = await Promise.all([
    db.jobProfileMatch.findMany({ where: { profileId: profile.id, ...(status ? { status } : {}) }, include: { job: { include: { source: true } } }, orderBy: { matchedAt: "desc" }, take: 40 }),
    db.jobProfileMatch.count({ where: { profileId: profile.id } }), db.jobProfileMatch.count({ where: { profileId: profile.id, status: "NEW" } }),
    db.jobProfileMatch.count({ where: { profileId: profile.id, status: "VIEWED" } }), db.jobProfileMatch.count({ where: { profileId: profile.id, status: "SAVED" } }),
    db.jobProfileMatch.count({ where: { profileId: profile.id, status: "APPLIED" } }), db.jobAction.count({ where: { profileId: profile.id, actionType: "OPENED" } }),
    db.syncRun.findFirst({ where: { profileId: profile.id }, orderBy: { startedAt: "desc" } }),
  ]);
  return <AppShell profiles={profiles} active={profile.slug}>
    <div className="page-heading"><div><p className="eyebrow">Search profile</p><h1>{profile.name}</h1><p className="subtitle">{profile.enabled ? "Actively looking for" : "Paused"} · {profile.location} · up to {profile.experienceMax} years’ experience</p></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><RefreshButton profileSlug={profile.slug} /><Link className="button dark" href={`/profiles/${profile.slug}/next`}>Next job →</Link><Link className="button" href={`/settings?profile=${profile.slug}`}><Settings2 size={13} />Edit profile</Link></div></div>
    <div className="stats-grid">{[["Matches", total], ["New", fresh], ["Viewed", viewed], ["Saved", saved], ["Applied", applied], ["Outbound clicks", opened], ["Last refreshed", lastSync ? lastSync.startedAt.toLocaleDateString() : "Never"], ["Experience filter", `${profile.experienceMin}–${profile.experienceMax} years`]].map(([label, value]) => <div className="stat-card" key={String(label)}><div className="stat-title">{label}</div><div className="stat-value" style={{ fontSize: typeof value === "string" && value.length > 9 ? 16 : undefined }}>{value}</div></div>)}</div>
    <div className="panel section-gap"><div className="panel-heading"><div><h2 className="panel-title">Vacancy queue</h2><p className="panel-caption">Next job · open original · save, apply, skip or return later</p></div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{[undefined, "NEW", "SAVED", "APPLIED", "SKIPPED"].map((filter) => <Link key={filter ?? "all"} className="count-chip" href={filter ? `?status=${filter}` : `/profiles/${slug}`}>{filter ?? "All"}</Link>)}</div></div>
      {matches.length ? <div className="jobs-grid">{matches.map(({ id, status: matchStatus, matchScore, matchReason, job }) => <article key={id} className="job-card"><div className="job-card-top"><div><TrackedExternalLink jobId={job.id} profileId={profile.id} className="job-title" href={job.originalUrl} target="_blank" rel="noopener noreferrer">{job.title} <ExternalLink size={12} style={{ display: "inline", opacity: .55 }} /></TrackedExternalLink><div className="job-company">{job.company ?? "Company not listed"}</div></div><span className="count-chip">{matchStatus} · {Math.round(matchScore)}%</span></div><div className="job-meta">{job.location && <span className="tag">{job.location}</span>}{job.salary && <span className="tag">{job.salary}</span>}<span className="tag">{job.source.name}</span>{job.publishedAt && <span className="tag">{job.publishedAt.toLocaleDateString()}</span>}</div>{matchReason && <p className="panel-caption">Match: {matchReason}</p>}{job.description && <p className="job-description">{job.description.slice(0, 380)}{job.description.length > 380 ? "…" : ""}</p>}<JobActions jobId={job.id} profileId={profile.id} originalUrl={job.originalUrl} /></article>)}</div> : <div className="empty"><strong>{status ? `No ${status.toLowerCase()} vacancies yet` : "Your queue is clear"}</strong>Refresh this profile to look for matching openings. No sample vacancies are shown.</div>}
    </div>
  </AppShell>;
}
