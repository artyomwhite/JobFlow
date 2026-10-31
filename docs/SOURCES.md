# Vacancy source research and status

Last reviewed: 2026-10-31. “Unavailable” means JobFlow has no adapter and does not claim that the source is connected.

| Source | JobFlow status | Method / notes |
| --- | --- | --- |
| Djinni | Active | Public RSS search feed (`https://djinni.co/jobs/rss/`); keywords passed to the feed. |
| DOU Jobs | Active | Public vacancies RSS feed (`https://jobs.dou.ua/vacancies/feeds/`). |
| Happy Monday | Active | Public JSON feed at `https://happymonday.ua/jobs-feed.json`, up to three pages of 100 recent active records per refresh. The feed is documented for public vacancy aggregation, with a 30-request/minute IP limit and original-link attribution requirement. [Official feed documentation](https://happymonday.ua/developers/job-feed). |
| Jooble | Needs configuration | Search API requires a key from the appropriate regional domain. The current API documentation describes a finite 500-request lifetime allowance on its free key, so JobFlow skips Jooble unless `JOOBLE_API_KEY` is set. [Jooble REST API documentation](https://jooblehelpcenter.freshdesk.com/en/support/solutions/articles/60001448238-rest-api-documentation). |
| Robota.ua | Unavailable | No public candidate-search API/feed with a stable documented contract was verified for this project. Employer integrations or public pages should not be assumed to grant search rights. |
| Work.ua | Unavailable | The official API information found describes employer recruitment-system/CRM workflows, not a public job-seeker vacancy-search API. No public feed/API was verified for this adapter. [Work.ua API/CRM FAQ](https://www.work.ua/articles/recruiting-system/2981/). |
| LinkedIn Jobs | Unavailable | No public read/search API for job seekers was identified. The official Job Posting API is partner-vetted and for publishing jobs; LinkedIn’s terms prohibit automated crawling without express permission and prohibit bypassing access controls. JobFlow does not use guest endpoints, cookies, scraping, or third-party scrapers. [Job Posting API terms](https://www.linkedin.com/legal/l/job-posting-api-terms), [Crawling terms](https://www.linkedin.com/legal/crawling-terms), [Prohibited software policy](https://www.linkedin.com/help/linkedin/answer/a1341387). |
| Lobby X | Unavailable | Public vacancy pages are visible, but no stable documented public feed/API was verified. JobFlow does not scrape the page. |
| Wellfound | Unavailable | No official public search API was verified. The site terms limit automated access; JobFlow does not use a scraper or third-party scraping API. [Wellfound Terms](https://wellfound.com/terms). |

## Adapter behavior

The adapter registry is `src/lib/sources/index.ts`. Each enabled adapter returns normalized public vacancy data; the shared sync service validates HTTPS URLs, applies profile matching, records errors, and updates source links. A transient HTTP failure is logged in `SyncRun` and does not change a working adapter to a permanent unavailable state.

Source rows are initialized by `npm run db:seed`. Their visible status is persisted in PostgreSQL, not inferred from mock results. Jooble remains unrequested until its optional key exists. Unsupported sources stay disabled in profile settings until a permitted method is implemented.
