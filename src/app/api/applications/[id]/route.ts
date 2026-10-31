import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/session";
import { publishDomainEvent } from "@/services/events";

const schema = z.object({ notes: z.string().max(5000).nullable().optional(), companyResponse: z.string().max(2000).nullable().optional(), interviewStatus: z.enum(["Applied", "No response", "Recruiter screen", "Interview", "Offer", "Rejected", "Withdrawn"]).optional() });
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid application update" }, { status: 400 });
  const { id } = await context.params;
  try {
    const application = await db.applicationRecord.update({ where: { id, ownerId: user.id }, data: parsed.data });
    if (parsed.data.interviewStatus) await publishDomainEvent({ type: "ApplicationStatusChanged", userId: user.id, applicationId: application.id, interviewStatus: application.interviewStatus, occurredAt: new Date() });
    return NextResponse.json({ application });
  }
  catch { return NextResponse.json({ error: "Application not found" }, { status: 404 }); }
}
