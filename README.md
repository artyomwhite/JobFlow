# JobFlow

JobFlow is a private, single-owner job-search workspace built with Next.js App Router, TypeScript, PostgreSQL on Neon, and Prisma. It collects vacancies only through adapters with an identified, public access method, matches them to editable search profiles, and tracks review and application activity without presenting sample data as real listings.

## What works in this version

- Eight seeded search profiles, plus profiles that can be added in Settings.
- Email/password sign-in with Better Auth, database-backed sessions, rate limiting, and one-time owner setup. Public registration is closed.
- Owner scoping on profiles, profile matches, actions, applications, analytics, and sync history.
- One shared vacancy record with separate profile matches and statuses; links to the same posting from more than one source are stored in `JobSourceLink`.
- A one-at-a-time “Next vacancy” review flow; `S` saves, `A` records an application, `K` skips, and `L` moves the match to Later.
- Saved, Applied, History, Analytics, and Settings pages.
- Real adapters for Djinni RSS, DOU Jobs RSS, and the public Happy Monday JSON feed. Jooble is available after an API key is configured. Other requested sources are explicitly marked unavailable until an authorized, stable integration is verified.
- Every refresh is recorded as a `SyncRun`, including counts and source errors. Refresh is user initiated; no cron schedule is required.

## Stack and architecture

- Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, and Lucide icons.
- Route Handlers validate requests with Zod and delegate changes to service modules.
- Better Auth handles password hashing, database sessions, cookie security, session renewal, and persistent rate limiting.
- PostgreSQL and Prisma store users, profiles, sources, jobs, matches, actions, applications, and synchronization history.
- Each source adapter implements the shared `SourceAdapter` contract in `src/lib/sources/`. `src/services/sync.ts` owns collection orchestration, matching, deduplication, persistence, and run history.
- `src/services/job-actions.ts` is the shared workflow service used by the action API. `src/services/events.ts` publishes domain events separately from notification delivery; no email or Telegram delivery provider is configured yet.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/API.md](docs/API.md), and [docs/SOURCES.md](docs/SOURCES.md) for implementation and extension notes.

Подробное руководство на русском: [docs/USER_GUIDE_RU.md](docs/USER_GUIDE_RU.md).

## Requirements

- Node.js 20.9 or later (the project was built with Node.js 24).
- npm.
- A PostgreSQL database. Neon is the production target. Local SQLite and mock vacancy databases are not supported.

## Local setup

1. Copy `.env.example` to `.env.local` and fill it in using a local editor. `.env.local` is ignored by Git. Use the Neon pooled connection string as `DATABASE_URL` and the direct connection string as `DIRECT_URL`.
2. Create random values for `BETTER_AUTH_SECRET` and `OWNER_SETUP_TOKEN` locally. Keep both private. The owner setup token must be at least 24 characters; the auth secret must be at least 32 characters.
3. Apply the checked-in Prisma migrations and seed the sources and eight starter profiles:

   ```powershell
   npm install
   npm run db:migrate
   npm run db:generate
   npm run db:seed
   ```

4. Start the app:

   ```powershell
   npm run dev
   ```

5. Open `http://localhost:3000/register`. Create the owner account with your email, a unique password of at least 12 characters, and the one-time `OWNER_SETUP_TOKEN`. The owner account is created only while no user exists. Public sign-up requests through Better Auth are rejected. After setup, remove `OWNER_SETUP_TOKEN` from the environment and redeploy/restart.
6. Sign in at `/login`.

If you run the seed after creating the owner, the seed assigns any unowned starter profiles to that owner. Running the seed before setup also works; the first owner setup claims unowned starter profiles.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Neon pooled PostgreSQL URL for normal app queries. |
| `DIRECT_URL` | Yes | Neon direct connection URL used by Prisma migrations. |
| `BETTER_AUTH_SECRET` | Yes | Secret used by Better Auth for session and token security. |
| `BETTER_AUTH_URL` | Yes in production | Canonical application origin, such as the Vercel production URL. |
| `OWNER_SETUP_TOKEN` | First setup only | One-time gate for creating the first owner account. Remove after setup. |
| `JOOBLE_API_KEY` | Optional | Key for the Jooble vacancy-search API; regional keys are required. |

Never commit `.env.local`, production environment files, database URLs, passwords, or API keys. Do not paste them into chat.

## Database and migrations

The schema is in `prisma/schema.prisma`; the initial migration is in `prisma/migrations/20261031_init/`. `npm run db:migrate` uses Prisma Migrate’s deploy command and applies pending migrations without resetting the database. Do not use `prisma db push` against production. Before a production migration, back up important data and inspect the generated SQL.

The data model keeps vacancy records separate from `JobProfileMatch`. A single application record is unique per vacancy and owner. Profile status is independent for each profile. `SearchProfile.ownerId` and `ApplicationRecord.ownerId` establish ownership boundaries for future users without adding tenant-specific infrastructure today.

## Authentication and first owner setup

Better Auth stores users, linked accounts, sessions, verification records, and rate-limit counters in PostgreSQL. Sessions expire after 14 days and can be renewed daily. Cookies are HttpOnly, SameSite Lax, and Secure in production. Sign-in is limited to five requests per IP per minute, with database-backed counters for serverless consistency.

`/register` is a one-time setup page. It accepts email and password over the app connection only when the server has an `OWNER_SETUP_TOKEN` and the database has no users. `/api/auth/sign-up/email` is explicitly blocked. Once the owner is created, the setup route remains closed even if the setup token is left in the environment.

## Source status and sync behavior

Source status is stored in the `Source` table. A status of `ACTIVE` means the adapter has a supported collection method; it does not promise that a source will always be reachable. Each attempt is recorded separately in `SyncRun`. A transient source failure is recorded as a failed run and does not permanently disable the adapter.

Refresh one profile at `/api/sync` with `{ "profileSlug": "react-developer" }`. Refresh all enabled profiles with `{}`. The sync service fetches each shared source once per request, applies profile filters, deduplicates by normalized URL/source identifiers, links source records to a canonical vacancy, and upserts profile matches. HTTP fetches have timeouts; one user sync is locked at a time. The route is capped at 60 seconds to fit conservative Vercel Hobby function settings.

## Adding a search profile

Use **Settings → Add a search profile**. Enter the profile name and one search keyword per line. Edit excluded terms, experience limits, location, enabled state, and source selections in the profile editor. Keywords live in PostgreSQL; no source edit is needed for a new profession.

To change the starter profiles, update `prisma/seed.ts`. The seed uses upsert and does not overwrite existing user edits.

## Adding a source adapter

1. Research and document a permitted, stable public API, feed, or page-access method.
2. Add an adapter under `src/lib/sources/` implementing `SourceAdapter` and return normalized `NormalizedJob` records.
3. Register the adapter in `src/lib/sources/index.ts`.
4. Add or update its source metadata in `prisma/seed.ts`; never mark a placeholder as active.
5. Keep provider-specific parsing in the adapter. Matching, deduplication, persistence, and run reporting remain in `src/services/sync.ts`.
6. Add adapter and normalization coverage, then run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.

## API and future integrations

Private APIs require a Better Auth session and validate ownership. Current endpoints are documented in [docs/API.md](docs/API.md). A future Telegram bot, email sender, Make scenario, or mobile client should call these APIs and the shared services rather than implementing its own source collection or matching. Dedicated service API tokens are not enabled yet; do not reuse the owner password or `BETTER_AUTH_SECRET` as an integration token.

## Vercel and Neon deployment

1. Set `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and (only during first setup) `OWNER_SETUP_TOKEN` in Vercel Environment Variables. Add `JOOBLE_API_KEY` only if using Jooble.
2. Apply migrations with `npm run db:migrate` against the production database before serving the new app version.
3. Seed the source catalogue and profiles with `npm run db:seed` after database setup.
4. Run a production build and deploy only after validation. Check Vercel function logs and the latest `SyncRun` records after the first sync.

No scheduled synchronization is configured. Vercel Hobby cron runs are restricted to at most once per day and have hourly timing precision, so manual refresh remains the primary workflow.

## Current limitations

- Neon/Vercel credentials are not stored in this repository. Production database migration and deployment require authorized account access and production environment variables.
- Jooble requires a regional API key and documents a finite free-request allowance; enable it only when you have the correct key and want to spend that allowance.
- Robota.ua, Work.ua, LinkedIn Jobs, Lobby X, and Wellfound are not scraped or represented as connected. Their exact status and research links are in [docs/SOURCES.md](docs/SOURCES.md).
- Email/Telegram notifications, scheduled jobs, external API tokens, and multi-user invitations are future extension points, not current features.
