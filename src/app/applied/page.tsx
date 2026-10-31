import { AppShell } from "@/components/app-shell";
import { ApplicationEditor } from "@/components/application-editor";
import { TrackedExternalLink } from "@/components/tracked-external-link";
import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export default async function AppliedPage() {
  const user = await requirePageUser();
  const [profiles, applications] = await Promise.all([db.searchProfile.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "asc" } }), db.applicationRecord.findMany({ where: { ownerId: user.id }, include: { job: { include: { source: true, matches: { where: { profile: { ownerId: user.id } }, include: { profile: true } } } } }, orderBy: { applicationDate: "desc" } })]);
  return <AppShell profiles={profiles} active="/applied"><div className="page-heading"><div><p className="eyebrow">Application tracker</p><h1>Applied</h1><p className="subtitle">A confirmed application is counted once even when a role matches multiple profiles.</p></div><span className="count-chip">{applications.length} applications</span></div>
    {applications.length ? <div className="jobs-grid">{applications.map((item) => <article className="job-card" key={item.id}><div className="job-card-top"><div><div className="job-title">{item.job.title}</div><div className="job-company">{item.job.company ?? "Company not listed"}</div></div><span className="count-chip">{item.interviewStatus}</span></div><div className="job-meta"><span className="tag">Applied {item.applicationDate.toLocaleDateString()}</span><span className="tag">{item.job.source.name}</span>{item.job.matches.map((match) => <span key={match.profileId} className="tag">{match.profile.name}</span>)}</div><TrackedExternalLink jobId={item.job.id} profileId={item.job.matches[0]?.profileId ?? ""} href={item.job.originalUrl} target="_blank" rel="noopener noreferrer" className="small-button">Open original ↗</TrackedExternalLink><ApplicationEditor applicationId={item.id} notes={item.notes} response={item.companyResponse} interviewStatus={item.interviewStatus} /></article>)}</div> : <div className="panel empty"><strong>No applications recorded</strong>Use “Applied” only after you submit your application. Opening a listing does not count.</div>}</AppShell>;
}
