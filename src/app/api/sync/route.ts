import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/session";
import { refreshProfiles, SyncServiceError } from "@/services/sync";

export const maxDuration = 60;
const schema = z.object({ profileSlug: z.string().min(1).max(100).optional() });

export async function POST(request: Request) {
  const user = await requireApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid sync request" }, { status: 400 });
  try {
    return NextResponse.json(await refreshProfiles(user.id, parsed.data.profileSlug));
  } catch (error) {
    if (error instanceof SyncServiceError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Synchronization failed unexpectedly" }, { status: 500 });
  }
}
