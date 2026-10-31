import { db } from "@/lib/db";
import type { MatchStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function listJobs(options: { profileId?: string; status?: MatchStatus; take?: number } = {}) {
  return db.jobProfileMatch.findMany({
    where: { ...(options.profileId ? { profileId: options.profileId } : {}), ...(options.status ? { status: options.status } : {}) },
    include: { job: { include: { source: true } }, profile: true },
    orderBy: [{ status: "asc" }, { matchedAt: "desc" }],
    take: options.take ?? 50,
  });
}
