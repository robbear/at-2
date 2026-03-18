# CLAUDE.md — at-2 (Atlasphere v2)

Atlasphere is a geo-CMS and location-based social publishing platform. Every GPS
coordinate on Earth has a shareable URL that hosts rich multimedia content. Users
create "markers" — geo-tagged posts discoverable by panning a map or via
multi-dimensional search. The entire search state is URL-serializable, so any
view of the map is shareable as a link.

Live site (v1): https://atlasphere.app
Repo: robbear/at-2.git

---

## Cost constraint

This is a **near-zero monthly cost** project until user scale justifies otherwise.
The only expected recurring cost is MongoDB Atlas (~$9/month). Every architectural
decision should be evaluated against this constraint. Do not introduce paid services
or tiers without flagging the cost implication explicitly.

---

## Monorepo layout

```
/packages/api      — Fastify server (Node.js, TypeScript)
/packages/web      — Next.js 15 frontend (TypeScript, App Router)
/packages/shared   — Shared types, Zod schemas, QuerySpec logic
/docs              — Architecture reference (see below)
```

---

## Stack

| Layer | Technology |
|---|---|
| API server | Fastify, TypeScript |
| Frontend | Next.js 15, TypeScript, App Router |
| Shared | Zod schemas (source of truth for all types) |
| Database | MongoDB Atlas (mongoose), geospatial index on `location` |
| Storage | Cloudflare R2 (S3-compatible), presigned upload flow |
| Auth | Auth.js |
| Deployment | Vercel (web + API as serverless functions) |
| CI/CD | GitHub Actions |
| Testing | Vitest, supertest, MongoDB Memory Server, Playwright |

---

## Core invariants — do not change without explicit discussion

- **Marker ID format**: `{userId}/{timestamp}` — this is the public URL path.
  Changing it breaks existing content and links.
- **QuerySpec**: search parameter shape is preserved from v1. See `/docs/queryspec.md`.
- **URL-as-view**: all search/filter state must be serializable to URL query params.
  Never store view state only in memory or component state.
- **MongoDB collections**: `markers` and `profiles`.

---

## Registration gating

Self-serve signup UI is implemented from day one, but account creation is gated
by a server-side allowlist. Registration attempts are checked before an account
is created.

- Allowlist is a comma-separated list of email addresses in the env var
  `REGISTRATION_ALLOWLIST` (e.g. `user@example.com,other@example.com`)
- `REGISTRATION_OPEN=true` env var bypasses the allowlist entirely — set this
  when ready to open to the public
- The gate must be trivially removable; it is a temporary restriction, not a
  permanent feature

---

## Map providers

Two providers supported: **Google Maps** (primary) and **Mapbox** (fallback).

### Quota management
- Google Maps JS API is hard-capped at **900 loads/month** with a $1 budget alert
- Mapbox free tier: **50,000 map loads/month**
- Map load counts per provider must be logged and tracked
- Alerting should fire as the Mapbox 50k threshold approaches (configure threshold
  in env, default 80% / 40k loads)

### Provider switching
- URL param `?mp=0` (Google) or `?mp=1` (Mapbox) allows per-session override (preserved from v1)
- `MAP_PROVIDER_OVERRIDE=google|mapbox` env var forces all map loads to a specific
  provider, superseding the URL param — use this to cut over instantly without a
  code change
- If no override is set and no URL param is present, default provider is **Mapbox**
  (more generous free quota)

---

## Storage (Cloudflare R2)

- Client requests a presigned R2 URL from the API; uploads directly to R2
- Server never proxies binary data
- R2 bucket layout: see `/docs/storage.md`
- Images resized client-side to 1024px max before upload (use `pica`)
- Profile pictures stored in R2 (not in MongoDB — no base64 in the DB)

---

## Content authoring

Content authoring is **MDX-based**. The legacy custom Markdown extensions from v1
are not supported and will not be reimplemented.

- Authoring UI is a **plain textarea** with raw MDX input — no rich editor, no
  editor library dependencies
- Legacy content in MongoDB that contains old extensions will render as-is;
  some text may look odd to readers — this is acceptable for now
- A future migration tool may reparse and rewrite legacy content to valid MDX,
  or legacy content may be purged; decision deferred

---

## API conventions

- All routes versioned under `/api/v1/`
- Request/response shapes validated with Zod schemas from `/packages/shared`
- Auth required on all write endpoints; verified via Auth.js session
- Ownership check on all writes: authenticated user's ID must match `userId`
  on the resource
- Presigned upload flow for all media — never proxy binary data through the API
- Error shape: `{ error: string, code?: string }` with appropriate HTTP status

---

## Frontend conventions

- App Router only — no Pages Router
- Fetch data server-side (RSC) where possible; use client components only when
  interactivity requires browser APIs
- Map rendering is always client-side (Google Maps / Mapbox require browser APIs)
- URL params drive all search/filter state
- The v1 UI is **not** a design contract — full UI redesign is in scope
  - Markers should be significantly smaller on the map
  - Side-by-side map + content preview is the likely layout direction
  - All UI decisions are open for reconsideration

---

## Code style

- TypeScript strict mode throughout
- Explicit return types on all exported functions
- Zod schemas are the source of truth — infer TypeScript types from them, do not
  duplicate type definitions
- No `any` — use `unknown` and narrow properly
- Files should stay under ~200 lines; split if exceeded
- Co-locate tests with source: `foo.ts` → `foo.test.ts`

---

## Docs index

| File | Contents |
|---|---|
| `/docs/data-model.md` | Marker and Profile schema |
| `/docs/queryspec.md` | QuerySpec parameters and URL serialization |
| `/docs/url-spec.md` | URL structure and deep-link format |
| `/docs/auth-flow.md` | Auth.js setup, session handling, registration gate |
| `/docs/storage.md` | R2 bucket layout and presigned upload flow |
| `/docs/map-providers.md` | Provider switching, quota tracking, alerting |
