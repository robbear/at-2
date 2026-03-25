# CLAUDE.md — at-2 (Atlasphere v2)

Atlasphere is a geo-CMS and location-based social publishing platform. Every GPS
coordinate on Earth has a shareable URL that hosts rich multimedia content. Users
create "markers" — geo-tagged posts discoverable by panning a map or via
multi-dimensional search. The entire search state is URL-serializable, so any
view of the map is shareable as a link.

Live site (v1): https://atlasphere.app
Repo: robbear/at-2.git

---

## Development environment

Node.js is managed via **nvm** — do not install Node.js system-wide or via Homebrew.

```bash
nvm install    # installs the version pinned in .nvmrc (Node 22)
nvm use        # switches to the pinned version in the current shell
```

**pnpm** is managed via **corepack**, which ships with Node and reads the
`packageManager` field in `package.json`. After `nvm use`, enable it once:

```bash
corepack enable pnpm
```

Corepack will automatically download and use the exact pnpm version declared in
`package.json` (`pnpm@9.15.0`). Do not install pnpm globally via `npm install -g`.

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

## Database isolation

All three contexts share the same `atlasphere-cluster` MongoDB Atlas cluster but
use **separate databases** to prevent any cross-contamination between production
data, test data, and local development data.

### Three database contexts

| Context | Database name | Who accesses it |
|---|---|---|
| Production | `atlasphere-v2` | Vercel production deployment only |
| Local dev | `atlasphere-v2-dev` | Developer's local instance |
| CI/CD | `atlasphere-v2-test` | GitHub Actions only |

### How database names are specified

The Atlas connection string is cluster-level and does not include a database name.
The database name is supplied via the `MONGODB_DB_NAME` environment variable, which
`server.ts` passes to mongoose's `connect()` call:

```ts
await mongoose.connect(env.MONGODB_URI, { dbName: env.MONGODB_DB_NAME });
```

This is how all three contexts are isolated — same cluster URI, different `MONGODB_DB_NAME`
per context.

### Environment variables

- `MONGODB_URI` — cluster connection string (no database name in the URI). Set in
  Vercel production environment. Never referenced in test code.
- `MONGODB_DB_NAME` — database name for the running context. Required by `parseEnv()`;
  startup fails with a clear error if absent.
  - Production (Vercel): `atlasphere-v2`
  - Local dev (`.env.local`): `atlasphere-v2-dev`
  - CI/CD (GitHub Actions): `atlasphere-v2-test`
- `MONGODB_URI_TEST` — same cluster connection string. Passed explicitly to `connectDb()`
  in test `beforeAll` hooks. Set as a GitHub Actions secret. Never used by `server.ts`.

### Local dev env loading

A single `.env.local` at the **repo root** is the source of truth for all local
dev environment variables. Both packages load it automatically:

- `packages/api` — loaded via `dotenv` at the top of `server.ts` before
  `parseEnv()` runs (non-production only).
- `packages/web` — loaded via `node --env-file-if-exists=../../.env.local` in
  the `dev` script before Next.js starts.

Copy `.env.local.example` to `.env.local` at the repo root and fill in values.
Do **not** create per-package `.env.local` files — they are gitignored but
serve no purpose and will cause confusion.

### Rules

- Test code must never reference `MONGODB_URI` — only `MONGODB_URI_TEST`
- Production database (`atlasphere-v2`) is never written to by tests or local dev
- CI test runs wipe the test database clean at the start of each run (`beforeAll`
  hook that drops all collections) — no teardown needed, next run wipes anyway
- Local dev database (`atlasphere-v2-dev`) is the developer's responsibility to
  manage

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

## UI & Design System

### Frameworks

| Library | Role |
|---|---|
| React | Component model |
| Tailwind CSS v3 | Utility-first styling |
| Shadcn/UI | Unstyled component primitives, owned in `components/ui/` |
| Lucide React | Icons |
| react-hook-form + Zod | Form handling and validation |
| next-mdx-remote | MDX rendering (server-side via RSC) |

### Design tokens (defined in `tailwind.config.ts`)

| Token | Value |
|---|---|
| Primary | `#2563eb` |
| Surface | `#ffffff` |
| Border | `slate-200` |
| Radius large | `0.75rem` |
| Radius standard | `0.375rem` |

### Component structure

```
src/components/
  maps/      — map components (MapboxMap, GoogleMap, BaseMarker, etc.)
  ui/        — Shadcn primitives (generated by shadcn CLI, do not hand-edit)
  layout/    — page-level layout shells
  auth/      — auth form components
  markers/   — marker detail, editor (future phases)
```

### Map implementation

- **Mapbox**: `react-map-gl` (v8, `/mapbox` subpath) with `mapbox-gl` as the underlying library
- **Google Maps**: `@vis.gl/react-google-maps`
- Provider selected via `selectProvider()` in `src/lib/map/provider-select.ts`
- Always use `flyTo` for map transitions — never instant snaps
- Custom marker pattern: `src/components/maps/BaseMarker.tsx`
- Map components live in `src/components/maps/`
- Map components are dynamically loaded with `ssr: false` (Mapbox and Google Maps require browser APIs)

### Forms

- Use `react-hook-form` + Zod schemas from `@at-2/shared`
- Single-column layout on mobile, max 2-column on desktop
- Error states: inline below input, `text-red-500 text-sm`

### MDX rendering

- Use `next-mdx-remote/rsc` for server-side MDX rendering
- Apply `prose` class from `@tailwindcss/typography`
- Custom overrides for code and blockquote in `tailwind.config.ts`

### Conventions

- Never use raw hex values in components — use Tailwind theme tokens
- Shadcn components in `components/ui/` are generated — do not hand-edit
- Co-locate component tests: `Foo.tsx` → `Foo.test.tsx`

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

## Git workflow

- **Never push directly to `main`** — main is protected
- All work happens on a feature branch, e.g. `feat/phase-1-scaffold`, `fix/auth-callback`, etc.
- Branch naming: `feat/`, `fix/`, `chore/`, or `docs/` prefix followed by a short description
- When work is complete, push the branch and open a PR against main:
  ```
  git push -u origin <branch-name>
  gh pr create --title "<title>" --body "<summary of changes>"
  ```
- PRs are reviewed and merged by the repo owner — do not merge your own PRs
- Commit messages should be concise and descriptive (e.g. `feat: scaffold monorepo root and shared package`)

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
