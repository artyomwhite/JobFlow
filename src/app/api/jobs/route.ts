import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/session";

const querySchema = z.object({ profile: z.string().optional(), status: z.enum(["NEW", "VIEWED", "SAVED", "APPLIED", "SKIPPED", "LATER"]).optional(), take: z.coerce.number().int().min(1).max(100).default(50) });

export async function GET(request: Request) {
  const user = await requireApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  const profile = parsed.data.profile ? await db.searchProfile.findFirst({ where: { slug: parsed.data.profile, ownerId: user.id } }) : null;
  if (parsed.data.profile && !profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  const jobs = await db.jobProfileMatch.findMany({ where: { profileId: profile?.id, status: parsed.data.status, profile: { ownerId: user.id } }, include: { job: { include: { source: true } }, profile: true }, orderBy: { matchedAt: "desc" }, take: parsed.data.take });
  return NextResponse.json({ jobs });
}
