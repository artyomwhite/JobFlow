# API reference

All paths use the Next.js Route Handler API. Private routes require an active Better Auth session; unauthenticated API calls return `401` JSON. Validation errors return `400`, inaccessible records return `404`, and sync conflicts return `409`. Error bodies use `{ "error": "..." }`.

## Authentication

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET`, `POST` | `/api/auth/[...all]` | Public entry point | Better Auth session/sign-in/sign-out. Public `/sign-up/email` is blocked. |
| `GET` | `/api/setup` | Public, non-sensitive | Returns whether an initial account is needed. |
| `POST` | `/api/setup` | One-time setup token | Creates the first owner only. Email/name/password/token are validated; password and token are never logged. |

## Search profiles and vacancies

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/search-profiles` | List only the current user’s profiles. |
| `POST` | `/api/search-profiles` | Create a profile from a name and keyword array. |
| `PATCH` | `/api/search-profiles/:id` | Update keywords, filters, enabled state, and source selections owned by the current user. |
| `GET` | `/api/jobs?profile=:slug&status=NEW&take=50` | List matches, scoped to the current owner. The profile filter is optional. Status values: `NEW`, `VIEWED`, `SAVED`, `APPLIED`, `SKIPPED`, `LATER`. |
| `POST` | `/api/jobs/:id/actions` | Record `VIEWED`, `OPENED`, `SAVED`, `APPLIED`, `SKIPPED`, or `LATER` for an owned profile match. `OPENED` records an external click but is not an application. |

Example action body:

```json
{ "profileId": "profile-id", "actionType": "SAVED" }
```

## Sources, synchronization, and analytics

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/sources` | List source methods/status and the current owner’s counts/latest runs. |
| `POST` | `/api/sync` | Refresh one profile (`{ "profileSlug": "react-developer" }`) or all enabled profiles (`{}`). |
| `GET` | `/api/sync/status?limit=20` | Return recent sync runs belonging to the current owner. Limit is 1–100. |
| `GET` | `/api/analytics?period=today` | Return owner-scoped totals, profile statistics, and source counts. Period values: `today`, `7d`, `30d`, `all` (default). |
| `PATCH` | `/api/applications/:id` | Update notes, company response, and interview status on an owned application. |

The sync response includes `status`, `jobsFound`, `jobsAdded`, `duplicatesSkipped`, and `failedSources`. Per-source errors and exact run details are available from `/api/sync/status`.

## Extension guidance

New browser actions and integrations should call these APIs. New Route Handlers should authenticate first, validate with Zod, verify owner access, call the existing service boundary, and use the same JSON error shape. Do not put provider parsing, deduplication, or job matching in a Route Handler.
