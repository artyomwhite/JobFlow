import { load } from "cheerio";
import type { NormalizedJob, SourceAdapter } from "./types";

const endpoint: Record<string, string> = {
  djinni: "https://djinni.co/jobs/rss/",
  dou: "https://jobs.dou.ua/vacancies/feeds/",
};

function parseDate(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? undefined : date;
}

export function rssAdapter(key: "djinni" | "dou"): SourceAdapter {
  return {
    key,
    async fetch(keywords) {
      const query = key === "djinni" && keywords.length ? `?keywords=${encodeURIComponent(keywords.slice(0, 3).join(" "))}` : "";
      const response = await fetch(`${endpoint[key]}${query}`, {
        headers: { "User-Agent": "JobFlow/0.1 (personal vacancy tracker; contact: local owner)" },
        signal: AbortSignal.timeout(12_000),
        next: { revalidate: 0 },
      });
      if (!response.ok) throw new Error(`${key} RSS returned HTTP ${response.status}`);
      const xml = await response.text();
      const $ = load(xml, { xmlMode: true });
      const items = $("item").toArray();
      return items.map((item): NormalizedJob | null => {
        const node = $(item);
        const title = node.find("title").first().text().trim();
        const link = node.find("link").first().text().trim();
        const description = node.find("description").first().text().trim();
        if (!title || !link) return null;
        const url = new URL(link);
        url.search = "";
        url.hash = "";
        return {
          externalId: node.find("guid").first().text().trim() || undefined,
          title,
          company: node.find("company").first().text().trim() || undefined,
          description: description.slice(0, 20_000) || undefined,
          location: node.find("location").first().text().trim() || undefined,
          originalUrl: link,
          publishedAt: parseDate(node.find("pubDate").first().text().trim()),
        };
      }).filter((item): item is NormalizedJob => item !== null);
    },
  };
}
