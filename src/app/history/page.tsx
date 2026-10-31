import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export default async function HistoryPage() {
  const user = await requirePageUser();
  const [profiles, actions] = await Promise.all([db.searchProfile.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "asc" } }), db.jobAction.findMany({ where: { profile: { ownerId: user.id } }, include: { job: true, profile: true }, orderBy: { createdAt: "desc" }, take: 200 })]);
  return <AppShell profiles={profiles} active="/history"><div className="page-heading"><div><p className="eyebrow">Your activity</p><h1>History</h1><p className="subtitle">Every view, outbound click, save, application and skip.</p></div><span className="count-chip">{actions.length} recent actions</span></div><section className="panel"><div className="table-wrap"><table><thead><tr><th>Action</th><th>Vacancy</th><th>Company</th><th>Profile</th><th>Date</th></tr></thead><tbody>{actions.map((action) => <tr key={action.id}><td><span className="count-chip">{action.actionType}</span></td><td>{action.job.title}</td><td>{action.job.company ?? "—"}</td><td>{action.profile.name}</td><td>{action.createdAt.toLocaleString()}</td></tr>)}</tbody></table>{!actions.length && <div className="empty">Activity appears after you start reviewing jobs.</div>}</div></section></AppShell>;
}
