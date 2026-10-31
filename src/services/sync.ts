import { createHash } from "node:crypto";
import { AdapterStatus, SyncStatus, type SearchProfile } from "@prisma/client";
import { db } from "@/lib/db";
import { adapters } from "@/lib/sources";
import { publishDomainEvent } from "@/services/events";
import { matchesProfile } from "@/services/matching";

export class SyncServiceError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

function normalizeUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Vacancy source URL must use HTTPS");
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) if (/^(utm_|ref$|source$|trk$)/i.test(key)) url.searchParams.delete(key);
  return url.toString().replace(/\/$/, "");
}

export async function refreshProfiles(ownerId: string, profileSlug?: string) {
  const profile = profileSlug ? await db.searchProfile.findFirst({ where: { slug: profileSlug, ownerId } }) : null;
  if (profileSlug && !profile) throw new SyncServiceError("Profile not found", 404);
  const profiles = profile ? [profile] : await db.searchProfile.findMany({ where: { ownerId, enabled: true } });
  if (!profiles.length) throw new SyncServiceError("No enabled search profiles", 400);
  const sourceKeys = [...new Set(profiles.flatMap((item) => item.enabledSources))];
  const sources = await db.source.findMany({ where: { key: { in: sourceKeys }, enabled: true } });
  const available = sources.some((source) => adapters[source.key] && (source.key !== "jooble" || process.env.JOOBLE_API_KEY));
  if (!available) throw new SyncServiceError("No configured, available sources for these profiles", 400);

  const lockUntil = new Date(Date.now() + 5 * 60_000);
  try {
    const claimed = await db.$transaction(async (tx) => {
      const existing = await tx.syncLock.findUnique({ where: { ownerId } });
      if (existing && existing.lockedUntil > new Date()) return false;
      await tx.syncLock.upsert({ where: { ownerId }, create: { ownerId, lockedUntil: lockUntil }, update: { lockedUntil: lockUntil } });
      return true;
    }, { isolationLevel: "Serializable" });
    if (!claimed) throw new SyncServiceError("A refresh is already running. Try again in a moment.", 409);
  } catch (error) {
    if (error instanceof SyncServiceError) throw error;
    throw new SyncServiceError("Could not acquire a sync lock. Try again shortly.", 409);
  }

  let totalFound = 0; let totalAdded = 0; let totalDuplicates = 0; let failed = 0;
  try {
    for (const source of sources) {
      const adapter = adapters[source.key];
      if (!adapter || (source.key === "jooble" && !process.env.JOOBLE_API_KEY)) continue;
      const relevantProfiles = profiles.filter((item) => item.enabledSources.includes(source.key));
      if (!relevantProfiles.length) continue;
      const run = await db.syncRun.create({ data: { sourceId: source.id, profileId: profile?.id, ownerId } });
      try {
        const terms = [...new Set(relevantProfiles.flatMap((item) => item.keywords))];
        const incoming = await adapter.fetch(terms);
        let added = 0; let duplicates = 0; let found = 0;
        for (const job of incoming) {
          const content = `${job.title} ${job.description ?? ""}`.toLocaleLowerCase();
          const matchedProfiles = relevantProfiles.map((item: SearchProfile) => ({ profile: item, result: matchesProfile(job.title, job.description ?? null, item) })).filter((item) => item.result.matches);
          if (!matchedProfiles.length) continue;
          found++;
          let canonical: string;
          try { canonical = normalizeUrl(job.originalUrl); } catch { duplicates++; continue; }
          const hash = createHash("sha256").update(`${canonical}|${content.slice(0, 2000)}`).digest("hex");
          let stored = await db.job.findFirst({ where: { OR: [{ normalizedUrl: canonical }, { sourceId: source.id, contentHash: hash }, ...(job.externalId ? [{ sourceId: source.id, externalId: job.externalId }] : [])] } });
          if (!stored) {
            try {
              stored = await db.job.create({ data: { sourceId: source.id, externalId: job.externalId, title: job.title.slice(0, 500), company: job.company?.slice(0, 250), description: job.description, salary: job.salary?.slice(0, 250), location: job.location?.slice(0, 250), remoteType: job.remoteType, employmentType: job.employmentType, originalUrl: job.originalUrl, normalizedUrl: canonical, contentHash: hash, publishedAt: job.publishedAt && !Number.isNaN(job.publishedAt.valueOf()) ? job.publishedAt : null } });
              added++;
            } catch {
              stored = await db.job.findFirst({ where: { OR: [{ normalizedUrl: canonical }, { sourceId: source.id, contentHash: hash }, ...(job.externalId ? [{ sourceId: source.id, externalId: job.externalId }] : [])] } });
              if (!stored) throw new Error("Could not save a vacancy after duplicate check");
              duplicates++;
            }
          } else duplicates++;
          await db.jobSourceLink.upsert({ where: { jobId_sourceId: { jobId: stored.id, sourceId: source.id } }, update: { originalUrl: job.originalUrl, externalId: job.externalId }, create: { jobId: stored.id, sourceId: source.id, originalUrl: job.originalUrl, externalId: job.externalId } });
          for (const { profile: target, result } of matchedProfiles) {
            const existingMatch = await db.jobProfileMatch.findUnique({ where: { jobId_profileId: { jobId: stored.id, profileId: target.id } }, select: { id: true } });
            await db.jobProfileMatch.upsert({ where: { jobId_profileId: { jobId: stored.id, profileId: target.id } }, update: { matchScore: result.score, matchReason: result.reason }, create: { jobId: stored.id, profileId: target.id, matchScore: result.score, matchReason: result.reason } });
            if (!existingMatch) await publishDomainEvent({ type: "NewJobMatched", userId: ownerId, jobId: stored.id, profileId: target.id, occurredAt: new Date() });
          }
        }
        totalFound += found; totalAdded += added; totalDuplicates += duplicates;
        await db.syncRun.update({ where: { id: run.id }, data: { status: SyncStatus.COMPLETED, jobsFound: found, jobsAdded: added, duplicatesSkipped: duplicates, completedAt: new Date() } });
        await db.source.update({ where: { id: source.id }, data: { lastSyncedAt: new Date(), adapterStatus: AdapterStatus.ACTIVE } });
        await publishDomainEvent({ type: "ProfileSyncCompleted", userId: ownerId, profileId: profile?.id ?? null, sourceKey: source.key, runId: run.id, jobsFound: found, jobsAdded: added, failed: false, occurredAt: new Date() });
      } catch (error) {
        failed++;
        const message = error instanceof Error ? error.message : "Unknown source error";
        await db.syncRun.update({ where: { id: run.id }, data: { status: SyncStatus.FAILED, errorMessage: message.slice(0, 1000), completedAt: new Date() } });
        await publishDomainEvent({ type: "ProfileSyncCompleted", userId: ownerId, profileId: profile?.id ?? null, sourceKey: source.key, runId: run.id, jobsFound: 0, jobsAdded: 0, failed: true, occurredAt: new Date() });
      }
    }
  } finally {
    await db.syncLock.updateMany({ where: { ownerId }, data: { lockedUntil: new Date(0) } });
  }
  return { status: failed ? "partial" : "completed", jobsFound: totalFound, jobsAdded: totalAdded, duplicatesSkipped: totalDuplicates, failedSources: failed };
}
