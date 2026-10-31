import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/session";

export const dynamic = "force-dynamic";
type Period = "today" | "7d" | "30d" | "all";
const periodLabels: Record<Period, string> = { today: "Today", "7d": "Last 7 days", "30d": "Last 30 days", all: "All time" };

function startOfTodayInKyiv(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const value = (key: string) => Number(parts.find((part) => part.type === key)?.value ?? 0);
  const localNowAsUtc = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
  const offset = localNowAsUtc - now.getTime();
  return new Date(Date.UTC(value("year"), value("month") - 1, value("day")) - offset);
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const user = await requirePageUser();
  const params = await searchParams;
  const period: Period = params.period === "today" || params.period === "7d" || params.period === "30d" ? params.period : "all";
  const now = new Date();
  const since = period === "today" ? startOfTodayInKyiv(now)
    : period === "7d" ? new Date(now.valueOf() - 7 * 86_400_000)
      : period === "30d" ? new Date(now.valueOf() - 30 * 86_400_000)
        : undefined;
  const matchWhere = { profile: { ownerId: user.id }, ...(since ? { matchedAt: { gte: since } } : {}) };
  const actionWhere = { profile: { ownerId: user.id }, ...(since ? { createdAt: { gte: since } } : {}) };
  const [profiles, matches, jobs, views, opens, applications, sources] = await Promise.all([
    db.searchProfile.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "asc" }, include: { _count: { select: { actions: { where: since ? { createdAt: { gte: since } } : {} } } }, matches: { where: since ? { matchedAt: { gte: since } } : {}, select: { status: true } } } }),
    db.jobProfileMatch.count({ where: matchWhere }),
    db.job.count({ where: { matches: { some: matchWhere } } }),
    db.jobAction.count({ where: { ...actionWhere, actionType: "VIEWED" } }),
    db.jobAction.count({ where: { ...actionWhere, actionType: "OPENED" } }),
    db.applicationRecord.count({ where: { ownerId: user.id, ...(since ? { applicationDate: { gte: since } } : {}) } }),
    db.source.findMany({
      include: {
        _count: {
          select: {
            jobLinks: {
              where: { job: { matches: { some: matchWhere } }, ...(since ? { firstSeenAt: { gte: since } } : {}) },
            },
          },
        },
        syncRuns: { where: { ownerId: user.id }, orderBy: { startedAt: "desc" }, take: 1 },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return <AppShell profiles={profiles} active="/analytics">
    <div className="page-heading"><div><p className="eyebrow">Search performance</p><h1>Analytics</h1><p className="subtitle">Metrics calculated from your actual saved jobs and recorded actions.</p></div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{(Object.keys(periodLabels) as Period[]).map((key) => <Link key={key} href={`/analytics?period=${key}`} className="count-chip" style={period === key ? { background: "#dcece2", color: "#245943" } : undefined}>{periodLabels[key]}</Link>)}</div>
    </div>
    <div className="stats-grid">{[["Unique vacancies", jobs], ["Profile matches", matches], ["Viewed", views], ["External clicks", opens], ["Confirmed applications", applications], ["Click to application", opens ? `${Math.round(applications / opens * 100)}%` : "—"]].map(([label, value]) => <div className="stat-card" key={String(label)}><div className="stat-title">{label}</div><div className="stat-value">{value}</div></div>)}</div>
    <div className="dashboard-grid section-gap">
      <section className="panel"><div className="panel-heading"><div><h2 className="panel-title">By profile</h2><p className="panel-caption">{periodLabels[period]} · matches and actions</p></div></div>
        {profiles.map((profile) => <div className="profile-row" key={profile.id}><div><div className="profile-name">{profile.name}</div><div className="profile-meta">{profile.matches.length} matches · {profile._count.actions} actions</div></div><div style={{ display: "flex", gap: 6 }}>{["SAVED", "APPLIED"].map((status) => <span className="count-chip" key={status}>{status.toLowerCase()} {profile.matches.filter((match) => match.status === status).length}</span>)}</div></div>)}
      </section>
      <section className="panel"><div className="panel-heading"><div><h2 className="panel-title">By source</h2><p className="panel-caption">Availability and imported vacancy counts</p></div></div>
        {sources.map((source) => <div className="source-row" key={source.id}><div><div className="profile-name">{source.name}</div><div className="profile-meta">{source.adapterStatus.toLowerCase().replaceAll("_", " ")} · {source.lastSyncedAt ? source.lastSyncedAt.toLocaleDateString() : "not yet synced"}</div></div><span className="count-chip">{source._count.jobLinks} jobs</span></div>)}
      </section>
    </div>
  </AppShell>;
}
