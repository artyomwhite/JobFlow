import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/session";

export async function GET(request: Request) {
  const user = await requireApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profiles = await db.searchProfile.findMany({ where: { ownerId: user.id }, include: { _count: { select: { matches: true, syncRuns: true } } }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ profiles });
}

const createSchema = z.object({ name: z.string().min(2).max(80), keywords: z.array(z.string().trim().min(1).max(120)).min(1).max(100) });
export async function POST(request: Request) {
  const user = await requireApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Name and at least one keyword are required" }, { status: 400 });
  const slug = `${parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${crypto.randomUUID().slice(0, 6)}`;
  const profile = await db.searchProfile.create({ data: { ...parsed.data, slug, ownerId: user.id, enabledSources: ["djinni", "dou", "happymonday", "jooble"] } });
  return NextResponse.json({ profile }, { status: 201 });
}
