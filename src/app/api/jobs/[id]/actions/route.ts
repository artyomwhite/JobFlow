import { NextResponse } from "next/server";
import { ActionType } from "@prisma/client";
import { z } from "zod";
import { requireApiUser } from "@/lib/session";
import { recordJobAction } from "@/services/job-actions";

const schema = z.object({ profileId: z.string().min(1), actionType: z.nativeEnum(ActionType), notes: z.string().max(5000).optional() });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  const { id: jobId } = await context.params;
  const result = await recordJobAction({ jobId, ...parsed.data, ownerId: user.id });
  if (!result) return NextResponse.json({ error: "Job is not linked to this profile" }, { status: 404 });
  return NextResponse.json({ action: result }, { status: 201 });
}
