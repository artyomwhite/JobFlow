import type { SearchProfile } from "@prisma/client";

export function matchesProfile(title: string, description: string | null, profile: Pick<SearchProfile, "keywords" | "excludedKeywords" | "experienceMin" | "experienceMax">) {
  const text = `${title} ${description ?? ""}`.toLocaleLowerCase();
  const excluded = profile.excludedKeywords.some((word) => word && text.includes(word.toLocaleLowerCase()));
  if (excluded) return { matches: false, score: 0, reason: "Matches an excluded keyword" };
  const matched = profile.keywords.filter((word) => word && text.includes(word.toLocaleLowerCase()));
  if (!matched.length) return { matches: false, score: 0, reason: "No keyword match" };
  const senior = /\b(senior|sr\.?|lead|staff|principal|директор|старший)\b/i.test(title);
  const years = [...text.matchAll(/(?:\b|до\s*)(\d{1,2})\s*(?:\+\s*)?(?:years?|yrs?|рок(?:ів|и)?|лет|года|години?)\b/gi)].map((match) => Number(match[1]));
  const maxYears = years.length ? Math.max(...years) : null;
  if (senior || (maxYears !== null && maxYears > profile.experienceMax)) return { matches: false, score: 0, reason: senior ? "Senior level excluded" : `Requires ${maxYears}+ years` };
  const unverified = maxYears === null && !/\b(junior|jr\.?|trainee|intern|entry.level|без досвіду|без опыта)\b/i.test(text);
  const score = Math.min(100, 55 + Math.min(matched.length, 4) * 10 + (unverified ? -10 : 0));
  return { matches: true, score, reason: `${matched.slice(0, 3).join(", ")}${unverified ? " · Unverified experience" : ""}` };
}
