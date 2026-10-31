import type { NormalizedJob, SourceAdapter } from "./types";

type FeedJob = {
  id?: number | string;
  title?: string;
  url?: string;
  description?: string;
  status?: string;
  company?: { name?: string };
  job_type?: string[];
  job_format?: string[];
  cities?: { name?: string }[];
  salary?: { currency?: string; min?: string | number; max?: string | number };
  published_at?: string;
};
type FeedResponse = { success?: boolean; data?: FeedJob[]; meta?: { total?: number; per_page?: number } };

export const happyMondayAdapter: SourceAdapter = {
  key: "happymonday",
  async fetch() {
    const headers = { "User-Agent": "JobFlow/0.1 (personal job search)" };
    const first = await fetch("https://happymonday.ua/jobs-feed.json?per_page=100&page=1", { headers, signal: AbortSignal.timeout(12_000), cache: "no-store" });
    if (!first.ok) throw new Error(`Happy Monday feed returned HTTP ${first.status}`);
    const initial = await first.json() as FeedResponse;
    if (!initial.success || !initial.data) throw new Error("Happy Monday feed returned an unexpected response");
    const total = initial.meta?.total ?? initial.data.length;
    const perPage = initial.meta?.per_page ?? 100;
    const pageCount = Math.min(3, Math.ceil(total / perPage));
    const pages = await Promise.all(Array.from({ length: Math.max(0, pageCount - 1) }, async (_, index) => {
      const page = index + 2;
      const response = await fetch(`https://happymonday.ua/jobs-feed.json?per_page=100&page=${page}`, { headers, signal: AbortSignal.timeout(12_000), cache: "no-store" });
      if (!response.ok) throw new Error(`Happy Monday feed page ${page} returned HTTP ${response.status}`);
      const result = await response.json() as FeedResponse;
      if (!result.success || !result.data) throw new Error("Happy Monday feed returned an unexpected response");
      return result.data;
    }));
    const jobs = [...initial.data, ...pages.flat()];
    return jobs.flatMap((job): NormalizedJob[] => {
      if (!job.title || !job.url || (job.status && job.status !== "active")) return [];
      const salary = job.salary && (job.salary.min || job.salary.max)
        ? `${job.salary.min ?? "?"}–${job.salary.max ?? "?"} ${job.salary.currency ?? ""}`.trim()
        : undefined;
      return [{
        externalId: job.id === undefined ? undefined : String(job.id),
        title: job.title,
        company: job.company?.name,
        description: job.description?.slice(0, 20_000),
        location: job.cities?.map((city) => city.name).filter(Boolean).join(", "),
        remoteType: job.job_format?.join(", "),
        employmentType: job.job_type?.join(", "),
        salary,
        originalUrl: job.url,
        publishedAt: job.published_at ? new Date(job.published_at) : undefined,
      }];
    });
  },
};
