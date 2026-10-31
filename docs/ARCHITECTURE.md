# Architecture

## Runtime flow

```text
Browser → Next.js page / Route Handler → Auth/session boundary → service module → Prisma → Neon PostgreSQL
                                                        ↘ source adapters → public feeds/APIs
                                                        ↘ domain events → future notification handlers
```

The current product is a Next.js full-stack app. It does not require a separate API server, worker, Redis, Docker, or message broker.

## Authentication and ownership

Better Auth owns password hashing and verification, database sessions, cookie issuance, session expiration/renewal, and endpoint rate limiting. The first account is made through `/register`, gated by `OWNER_SETUP_TOKEN` and a database check that no user exists. The standard public sign-up endpoint is denied.

Server pages call `requirePageUser`; Route Handlers call `requireApiUser`. Route handlers must scope every record lookup to the authenticated user. `SearchProfile.ownerId` is the ownership root for profile matches and actions. Applications and sync runs also carry `ownerId`; canonical public job records and source metadata are shared data.

`User.role` is persisted for future authorization. The current UI is single-owner: no invites, role editor, or unrestricted registration exists.

## Responsibilities

- `src/lib/auth.ts`, `src/lib/session.ts`, and `/api/auth/*`: authentication and session boundaries.
- `src/lib/sources/*`: provider request, parsing, and normalization only.
- `src/services/matching.ts`: keyword, excluded-term, seniority, and experience rules.
- `src/services/sync.ts`: collection orchestration, source run records, cross-source links, matching, deduplication, sync lock, and persistence.
- `src/services/job-actions.ts`: profile-scoped review actions and owner-scoped application creation.
- `src/services/events.ts`: small in-process domain event dispatcher, separate from delivery.
- `src/app/api/*`: request validation, session enforcement, status codes, and response formatting.
- `src/app/*`: page composition and user interaction; no database credentials or provider API keys reach the browser.

## Deduplication and status model

`Job` holds one normalized vacancy. `JobSourceLink` preserves which sources advertised it and each source’s original link. `JobProfileMatch` is unique on `(jobId, profileId)` and has its own workflow status. User actions are append-only events associated with that profile match. An `ApplicationRecord` is unique on `(jobId, ownerId)`, so the same real application is not duplicated across matching profiles.

## Events and notifications

The sync and action services emit typed domain events after database state is committed. Handlers are registered with `subscribeToDomainEvents`. Handler failures are isolated from completed vacancy/application changes. No delivery channel is registered today. A future Telegram/email integration can subscribe and deliver messages without taking ownership of job matching or sync logic.

This event dispatcher is process-local, not a durable queue. If guaranteed notification delivery becomes necessary, add an outbox table and a background worker rather than making a message broker a prerequisite now.

## Background work

The refresh API calls `refreshProfiles` in a server function with per-source request timeouts, bounded Happy Monday pagination, a per-user sync lock, and a 60-second maximum duration. This is appropriate for the current manual refresh scope. The user interface does not rely on cron. A future worker can call the same `refreshProfiles` service; it should not duplicate collection or matching logic.

## External clients

An external client should use the authenticated API surface in `docs/API.md`. A future machine integration should receive a dedicated, revocable token with scoped permissions and rate limits. The owner’s browser session, password, and Better Auth secret are not integration credentials.
