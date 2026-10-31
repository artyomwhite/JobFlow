import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, MousePointer2, Sparkles, Eye, Bookmark } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RefreshButton } from "@/components/refresh-button";
import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/session";

export const dynamic = "force-dynamic";
const number = (value: number) => new Intl.NumberFormat("en-US").format(value);

export default async function OverviewPage() {
  const user = await requirePageUser();
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "Europe/Kyiv" });
  const [profiles, jobs, matches, fresh, viewed, opened, saved, applied, sources, activity] = await Promise.all([
    db.searchProfile.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "asc" }, include: { _count: { select: { matches: true } }, matches: { select: { status: true } } } }),
    db.job.count({ where: { matches: { some: { profile: { ownerId: user.id } } } } }), db.jobProfileMatch.count({ where: { profile: { ownerId: user.id } } }), db.jobProfileMatch.count({ where: { profile: { ownerId: user.id }, status: "NEW" } }), db.jobAction.count({ where: { profile: { ownerId: user.id }, actionType: "VIEWED" } }),
    db.jobAction.count({ where: { profile: { ownerId: user.id }, actionType: "OPENED" } }), db.jobProfileMatch.count({ where: { profile: { ownerId: user.id }, status: "SAVED" } }), db.applicationRecord.count({ where: { ownerId: user.id } }),
    db.source.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { jobLinks: { where: { job: { matches: { some: { profile: { ownerId: user.id } } } } } } } }, syncRuns: { where: { ownerId: user.id }, orderBy: { startedAt: "desc" }, take: 1 } } }),
    db.jobAction.findMany({ where: { profile: { ownerId: user.id } }, include: { job: true, profile: true }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  return <AppShell profiles={profiles} active="/">
    <div className="page-heading"><div><p className="eyebrow">{today}</p><h1>Good morning. Let’s find your next role.</h1><p className="subtitle">Your job search, organized around the way you work.</p></div><RefreshButton /></div>
    <div className="stats-grid">
      {[["Unique vacancies", jobs, "Across all configured sources"], ["Profile matches", matches, `${fresh} waiting in your queue`], ["External clicks", opened, `${viewed} viewed`], ["Confirmed applications", applied, "Recorded by you"]].map(([label, value, note]) => <div className="stat-card" key={String(label)}><div className="stat-title">{label}</div><div className="stat-value">{number(Number(value))}</div><div className="stat-foot">{note}</div></div>)}
    </div>
    <div className="dashboard-grid">
      <section className="panel"><div className="panel-heading"><div><h2 className="panel-title">Search profiles</h2><p className="panel-caption">Progress across your active roles</p></div><Link href="/settings" className="panel-caption">Manage ↗</Link></div>
        {profiles.map((profile) => { const pending = profile.matches.filter((match) => match.status === "NEW").length; const savedCount = profile.matches.filter((match) => match.status === "SAVED").length; return <Link key={profile.id} className="profile-row" href={`/profiles/${profile.slug}`}><div><div className="profile-name">{profile.name}</div><div className="profile-meta">{profile._count.matches} matches · {savedCount} saved · {profile.enabled ? "Active" : "Paused"}</div></div><span className="count-chip">{pending} new <ArrowUpRight size={11} style={{ verticalAlign: "middle" }} /></span></Link>; })}
      </section>
      <div style={{ display: "grid", gap: 14, alignContent: "start" }}><section className="panel"><div className="panel-heading"><div><h2 className="panel-title">Source health</h2><p className="panel-caption">Verified collection methods</p></div><BriefcaseBusiness size={15} color="#82908a" /></div>
        {sources.map((source) => <div className="source-row" key={source.id}><div><div className="profile-name">{source.name}</div><div className="profile-meta">{source.method}</div></div><span className="count-chip">{source.adapterStatus === "ACTIVE" ? `${source._count.jobLinks} jobs` : source.adapterStatus.toLowerCase().replaceAll("_", " ")}</span></div>)}
      </section><section className="panel"><div className="panel-heading"><div><h2 className="panel-title">Recent activity</h2><p className="panel-caption">Your latest job search actions</p></div><Sparkles size={15} color="#82908a" /></div>
        {activity.length ? activity.map((action) => <div className="activity-row" key={action.id}><div><div className="profile-name">{action.actionType.toLowerCase()} · {action.job.title}</div><div className="profile-meta">{action.profile.name} · {action.createdAt.toLocaleDateString()}</div></div><span className="count-chip">{action.job.company ?? action.job.sourceId}</span></div>) : <p className="panel-caption">Actions appear here as you review jobs.</p>}
      </section></div>
    </div>
    <div className="section-gap" style={{ display: "flex", gap: 9, flexWrap: "wrap" }}><span className="count-chip"><Eye size={11} style={{ verticalAlign: "middle" }} /> {viewed} viewed</span><span className="count-chip"><MousePointer2 size={11} style={{ verticalAlign: "middle" }} /> {opened} outbound clicks</span><span className="count-chip"><Bookmark size={11} style={{ verticalAlign: "middle" }} /> {saved} saved</span></div>
  </AppShell>;
}
