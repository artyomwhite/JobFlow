import { ActionType, MatchStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { publishDomainEvent } from "@/services/events";

const statusForAction: Partial<Record<ActionType, MatchStatus>> = { VIEWED: "VIEWED", SAVED: "SAVED", APPLIED: "APPLIED", SKIPPED: "SKIPPED", LATER: "LATER" };

export async function recordJobAction(input: { jobId: string; profileId: string; ownerId: string; actionType: ActionType; notes?: string }) {
  const match = await db.jobProfileMatch.findFirst({ where: { jobId: input.jobId, profileId: input.profileId, profile: { ownerId: input.ownerId } } });
  if (!match) return null;
  const action = await db.$transaction(async (tx) => {
    const created = await tx.jobAction.create({ data: { jobId: input.jobId, profileId: input.profileId, actionType: input.actionType, notes: input.notes } });
    const status = statusForAction[input.actionType];
    if (status) await tx.jobProfileMatch.update({ where: { id: match.id }, data: { status } });
    if (input.actionType === "APPLIED") await tx.applicationRecord.upsert({ where: { jobId_ownerId: { jobId: input.jobId, ownerId: input.ownerId } }, update: { notes: input.notes ?? undefined }, create: { jobId: input.jobId, ownerId: input.ownerId, notes: input.notes } });
    return created;
  });
  await publishDomainEvent({ type: "JobActionRecorded", userId: input.ownerId, jobId: input.jobId, profileId: input.profileId, actionType: input.actionType, occurredAt: action.createdAt });
  return action;
}
