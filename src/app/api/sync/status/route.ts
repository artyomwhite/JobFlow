import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/session";
import { db } from "@/lib/db";

const query = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20) });
export async function GET(request: Request) {
  const user = await requireApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  const runs = await db.syncRun.findMany({ where: { ownerId: user.id }, include: { source: true, profile: true }, orderBy: { startedAt: "desc" }, take: parsed.data.limit });
  return NextResponse.json({ syncRuns: runs });
}
