import { rssAdapter } from "./rss";
import { joobleAdapter } from "./jooble";
import { happyMondayAdapter } from "./happymonday";
import type { SourceAdapter } from "./types";

export const adapters: Record<string, SourceAdapter> = {
  djinni: rssAdapter("djinni"),
  dou: rssAdapter("dou"),
  jooble: joobleAdapter,
  happymonday: happyMondayAdapter,
};
