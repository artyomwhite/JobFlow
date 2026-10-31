import type { SourceAdapter } from "./types";

type JoobleJob = { id?: string; title?: string; company?: string; snippet?: string; salary?: string; location?: string; link?: string; updated?: string };
type JoobleResponse = { jobs?: JoobleJob[] };

export const joobleAdapter: SourceAdapter = {
  key: "jooble",
  async fetch(keywords) {
    const key = process.env.JOOBLE_API_KEY;
    if (!key) throw new Error("JOOBLE_API_KEY is not configured");
    const response = await fetch(`https://ua.jooble.org/api/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "JobFlow/0.1" },
      body: JSON.stringify({ keywords: keywords.slice(0, 8).join(", "), location: "Ukraine", page: "1" }),
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Jooble API returned HTTP ${response.status}`);
    const data = await response.json() as JoobleResponse;
    return (data.jobs ?? []).flatMap((job) => {
      if (!job.title || !job.link) return [];
      return [{ externalId: job.id, title: job.title, company: job.company, description: job.snippet, salary: job.salary, location: job.location, originalUrl: job.link, publishedAt: job.updated ? new Date(job.updated) : undefined }];
    });
  },
};
