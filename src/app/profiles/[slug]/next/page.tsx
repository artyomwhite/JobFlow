import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { JobActions } from "@/components/job-actions";
import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NextJobPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requirePageUser();
  const { slug } = await params;
  const [profiles, profile] = await Promise.all([
    db.searchProfile.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "asc" } }),
    db.searchProfile.findFirst({ where: { slug, ownerId: user.id } }),
  ]);
  if (!profile) notFound();
  const match = await db.jobProfileMatch.findFirst({
    where: { profileId: profile.id, status: "NEW" },
    include: { job: { include: { source: true } } },
    orderBy: [{ matchScore: "desc" }, { matchedAt: "desc" }],
  });

  return <AppShell profiles={profiles} active={profile.slug}>
    <div className="page-heading">
      <div><p className="eyebrow">{profile.name} · Review queue</p><h1>Next vacancy</h1><p className="subtitle">Review one role at a time. Use S to save, A applied, K to skip, L for later.</p></div>
      <Link className="button" href={`/profiles/${slug}`}><ArrowLeft size={13} />All vacancies</Link>
    </div>
    {match ? <article className="job-card" style={{ maxWidth: 760, margin: "0 auto", padding: 28 }}>
      <div className="page-heading" style={{ marginBottom: 16 }}><div><div className="job-title" style={{ fontSize: 21 }}>{match.job.title}</div><div className="job-company">{match.job.company ?? "Company not listed"}</div></div><span className="count-chip">{Math.round(match.matchScore)}% match</span></div>
      <div className="job-meta">{match.job.location && <span className="tag">{match.job.location}</span>}{match.job.salary && <span className="tag">{match.job.salary}</span>}<span className="tag">{match.job.source.name}</span>{match.job.publishedAt && <span className="tag">{match.job.publishedAt.toLocaleDateString()}</span>}</div>
      {match.matchReason && <p className="panel-caption">{match.matchReason}</p>}
      {match.job.description && <p className="job-description" style={{ fontSize: 13, lineHeight: 1.75, whiteSpace: "pre-line" }}>{match.job.description.slice(0, 6000)}</p>}
      <JobActions jobId={match.job.id} profileId={profile.id} originalUrl={match.job.originalUrl} markViewedOnMount enableHotkeys />
    </article> : <div className="panel empty"><strong>All caught up</strong>There are no new vacancies in this profile. Refresh to search again, or review the full list.<p style={{ marginTop: 16 }}><Link className="button" href={`/profiles/${slug}`}>View all vacancies</Link></p></div>}
  </AppShell>;
}
