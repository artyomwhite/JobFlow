import { AppShell } from "@/components/app-shell";
import { JobActions } from "@/components/job-actions";
import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export default async function SavedPage() {
  const user = await requirePageUser();
  const [profiles, matches] = await Promise.all([db.searchProfile.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "asc" } }), db.jobProfileMatch.findMany({ where: { profile: { ownerId: user.id }, status: "SAVED" }, include: { job: { include: { source: true } }, profile: true }, orderBy: { matchedAt: "desc" } })]);
  return <AppShell profiles={profiles} active="/saved"><div className="page-heading"><div><p className="eyebrow">Your shortlist</p><h1>Saved vacancies</h1><p className="subtitle">Roles you want to come back to.</p></div><span className="count-chip">{matches.length} saved</span></div>{matches.length ? <div className="jobs-grid">{matches.map((match) => <article className="job-card" key={match.id}><div className="job-title">{match.job.title}</div><div className="job-company">{match.job.company ?? "Company not listed"} · {match.profile.name}</div><div className="job-meta"><span className="tag">{match.job.source.name}</span>{match.job.location && <span className="tag">{match.job.location}</span>}</div>{match.job.description && <p className="job-description">{match.job.description.slice(0, 300)}</p>}<JobActions jobId={match.job.id} profileId={match.profileId} originalUrl={match.job.originalUrl} /></article>)}</div> : <div className="panel empty"><strong>No saved vacancies yet</strong>Save a role from any profile to keep it here.</div>}</AppShell>;
}
