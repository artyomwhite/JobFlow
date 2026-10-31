export type NormalizedJob = {
  externalId?: string;
  title: string;
  company?: string;
  description?: string;
  salary?: string;
  location?: string;
  remoteType?: string;
  employmentType?: string;
  originalUrl: string;
  publishedAt?: Date;
};

export type SourceAdapter = {
  key: string;
  fetch: (keywords: string[]) => Promise<NormalizedJob[]>;
};
