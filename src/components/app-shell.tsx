import Link from "next/link";
import { Activity, BarChart3, Bookmark, BriefcaseBusiness, Clock3, LayoutDashboard, Settings2 } from "lucide-react";
import { SignOut } from "@/components/sign-out";
import type { SearchProfile } from "@prisma/client";

const primaryLinks = [
  ["Overview", "/", LayoutDashboard],
  ["Saved", "/saved", Bookmark],
  ["Applied", "/applied", BriefcaseBusiness],
  ["History", "/history", Clock3],
  ["Analytics", "/analytics", BarChart3],
] as const;

export function AppShell({ children, profiles, active }: { children: React.ReactNode; profiles: SearchProfile[]; active?: string }) {
  return <div className="shell">
    <aside className="sidebar">
      <Link href="/" className="brand"><span className="brand-mark"><Activity size={17} /></span>JobFlow</Link>
      <div className="nav-section"><div className="nav-label">Workspace</div>{primaryLinks.map(([label, href, Icon]) => <Link key={href} href={href} className={`nav-link ${active === href ? "active" : ""}`}><Icon className="nav-icon" />{label}</Link>)}</div>
      <div className="nav-section"><div className="nav-label">Search profiles</div>{profiles.map((profile) => <Link key={profile.id} href={`/profiles/${profile.slug}`} className={`nav-link profile-link ${active === profile.slug ? "active" : ""}`}><span className="nav-icon" style={{ display: "grid", placeItems: "center", fontSize: 10 }}>◦</span>{profile.name}</Link>)}</div>
      <div className="sidebar-bottom"><Link href="/settings" className={`nav-link ${active === "/settings" ? "active" : ""}`}><Settings2 className="nav-icon" />Settings</Link><div style={{ marginTop: 12, paddingLeft: 10 }}><SignOut /></div></div>
    </aside>
    <main className="main"><header className="topbar"><span className="crumb">Personal workspace / <b style={{ color: "#33413b" }}>{active && profiles.find((profile) => profile.slug === active)?.name || (active === "/" ? "Overview" : active?.replace("/", "").replace(/^./, (char) => char.toUpperCase()))}</b></span><span className="user-pill"><span>Single-user workspace</span><span className="avatar">JF</span></span></header><div className="content">{children}</div></main>
  </div>;
}
