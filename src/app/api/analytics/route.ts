import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/session";

const schema = z.object({ period: z.enum(["today", "7d", "30d", "all"]).default("all") });
export async function GET(request: Request) {
  const user = await requireApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  const now = new Date();
  const since = parsed.data.period === "today" ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
    : parsed.data.period === "7d" ? new Date(now.valueOf() - 7 * 86_400_000)
      : parsed.data.period === "30d" ? new Date(now.valueOf() - 30 * 86_400_000)
        : undefined;
  const matchWhere = { profile: { ownerId: user.id }, ...(since ? { matchedAt: { gte: since } } : {}) };
  const actionWhere = { profile: { ownerId: user.id }, ...(since ? { createdAt: { gte: since } } : {}) };
  const [profiles, uniqueJobs, profileMatches, viewed, clicks, saved, skipped, applications, sourceStats] = await Promise.all([
    db.searchProfile.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "asc" }, include: { matches: { where: matchWhere, select: { status: true } }, _count: { select: { actions: { where: actionWhere } } } } }),
    db.job.count({ where: { matches: { some: matchWhere } } }),
    db.jobProfileMatch.count({ where: matchWhere }),
    db.jobAction.count({ where: { ...actionWhere, actionType: "VIEWED" } }),
    db.jobAction.count({ where: { ...actionWhere, actionType: "OPENED" } }),
    db.jobProfileMatch.count({ where: { ...matchWhere, status: "SAVED" } }),
    db.jobProfileMatch.count({ where: { ...matchWhere, status: "SKIPPED" } }),
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
      },
      orderBy: { name: "asc" },
    }),
  ]);
  return NextResponse.json({
    period: parsed.data.period,
    totals: { uniqueJobs, profileMatches, viewed, externalClicks: clicks, saved, skipped, applications, clickToApplication: clicks ? applications / clicks : null },
    profiles: profiles.map((profile) => ({ id: profile.id, slug: profile.slug, name: profile.name, matches: profile.matches.length, new: profile.matches.filter((match) => match.status === "NEW").length, saved: profile.matches.filter((match) => match.status === "SAVED").length, applied: profile.matches.filter((match) => match.status === "APPLIED").length, actions: profile._count.actions })),
    sources: sourceStats.map((source) => ({ id: source.id, name: source.name, adapterStatus: source.adapterStatus, jobs: source._count.jobLinks })),
  });
}
