import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/session";

const patchSchema = z.object({ name: z.string().min(2).max(80).optional(), keywords: z.array(z.string().trim().min(1).max(120)).min(1).max(100).optional(), excludedKeywords: z.array(z.string().trim().min(1).max(120)).max(100).optional(), enabled: z.boolean().optional(), experienceMin: z.number().int().min(0).max(20).optional(), experienceMax: z.number().int().min(0).max(40).optional(), location: z.string().max(100).optional(), workFormat: z.array(z.string().max(30)).optional(), enabledSources: z.array(z.string()).optional() });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid profile settings" }, { status: 400 });
  const { id } = await context.params;
  const current = await db.searchProfile.findFirst({ where: { id, ownerId: user.id } });
  if (!current) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  const values = parsed.data;
  const maximum = values.experienceMax ?? current.experienceMax;
  const minimum = values.experienceMin ?? current.experienceMin;
  if (minimum > maximum) return NextResponse.json({ error: "Minimum experience cannot exceed maximum" }, { status: 400 });
  if (values.enabledSources) {
    const knownSources = await db.source.findMany({ where: { key: { in: values.enabledSources } }, select: { key: true } });
    if (knownSources.length !== new Set(values.enabledSources).size) return NextResponse.json({ error: "One or more selected sources do not exist" }, { status: 400 });
  }
  return NextResponse.json({ profile: await db.searchProfile.update({ where: { id }, data: values }) });
}
