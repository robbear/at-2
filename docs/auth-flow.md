# Auth Flow

Authentication is handled by **Auth.js v5** (formerly NextAuth.js), configured in
`/packages/web` (Next.js App Router). The Fastify API (`/packages/api`) validates
requests by decoding the same JWT using a shared `AUTH_SECRET`.

---

## Provider

**Email + password only** for initial launch (Auth.js credentials provider).
Google OAuth is deferred — it will be added as a second provider later with
minimal code changes. The same email-matching profile-link logic will apply to
Google sign-in when added.

Password hashing uses **bcrypt** (via the `bcryptjs` library, 12 rounds).

---

## Email service

Transactional email (verification links, password reset links) is sent via
**Resend** (free tier: 3,000 emails/month). Configured with:
- `RESEND_API_KEY` — Resend API key. If absent, email sending is skipped and
  the action is logged to console (useful for local dev/testing without creds).
- `RESEND_FROM_EMAIL` — sender address (default: `noreply@atlasphere.app`)

---

## Session strategy

JWT (no DB session table). Keeps infrastructure cost minimal.

The session cookie is named **`atlasphere.session-token`** (custom name — avoids
the `__Secure-` prefix ambiguity and stays consistent across environments).
Session is accessible server-side via `auth()` and client-side via `useSession()`.

---

## API authentication

The API (`/packages/api`) validates write requests using the Auth.js session JWT
passed as a Bearer token in the `Authorization` header.

The API decodes the token with `decode()` from `@auth/core/jwt`, using the
shared `AUTH_SECRET` and `"atlasphere.session-token"` as the salt (which must
match the cookie name set in `packages/web/src/auth.ts`).

Write endpoints that require auth:
- All `POST`, `PUT`, `PATCH`, `DELETE` routes (except `/api/v1/auth/*`)
- Middleware returns 401 `{ error: "Unauthorized" }` if token is missing/invalid
- Middleware returns 403 `{ error: "Forbidden" }` if authenticated user does not
  own the target resource

**Server components/actions making API calls** extract the raw cookie value via
`cookies()` from `next/headers` and pass it as the Bearer token:
```ts
const sessionToken = cookieStore.get("atlasphere.session-token")?.value;
// Authorization: `Bearer ${sessionToken}`
```

---

## Registration flow

1. User submits registration form at `/auth/register` (email, password, confirmPassword)
2. Web server action calls `POST /api/v1/auth/register`
3. API checks registration gate (see below)
4. If allowed: hash password, generate verification token, create Profile document
5. Send verification email via Resend with a link to `/auth/verify?token=...`
6. Redirect to `/auth/check-email`

---

## Email verification

1. User clicks link in email → `/auth/verify?token=...`
2. Page server component calls `POST /api/v1/auth/verify-email` with `{ token }`
3. API finds matching Profile, sets `emailVerified: true`, clears `verificationToken`
4. Page displays success or error

Email is required before the user can sign in. The credentials provider rejects
sign-in attempts with `emailVerified: false`.

---

## Sign in

Auth.js credentials provider:
1. Calls `POST /api/v1/auth/credentials` with email + password
2. API finds profile by email, checks `emailVerified`, compares bcrypt hash
3. Returns user object on success, 401 on failure
4. Auth.js issues JWT session cookie on success

Sign-in page: `/auth/signin`

---

## Password reset flow

**Request:**
1. User submits email at `/auth/reset`
2. Server action calls `POST /api/v1/auth/reset-request`
3. API always returns 200 (no leak of whether email exists)
4. If email found: generate reset token, store bcrypt hash in `profile.resetToken`,
   send email with link to `/auth/reset/confirm?token=...`

**Completion:**
1. User submits new password at `/auth/reset/confirm?token=...`
2. Server action calls `POST /api/v1/auth/reset`
3. API scans profiles with `resetToken` set and compares using bcrypt
4. v1 migration path (see below) or standard reset
5. Clears `resetToken`, redirects to `/auth/signin`

---

## v1 account migration

v1 accounts (AWS Cognito email+password) cannot be migrated by password transfer —
Cognito does not export password hashes.

**Migration path: password reset flow**

1. v1 user visits the password reset form and enters their email
2. API finds the existing Profile document (imported from v1) which has no
   `passwordHash` field set
3. The reset flow proceeds — this is detected by the absence of `passwordHash`
4. On completion: set `passwordHash` + `emailVerified = true` on the **existing**
   profile document. No new account is created.
5. The user's `userId`, markers, and all content are preserved

From the user's perspective: "reset your password to access the new version."

This same email-matching logic will apply to Google OAuth when added:
a Google sign-in matching an existing profile email links to that profile
rather than creating a duplicate.

---

## Registration gating

Account creation is gated until `REGISTRATION_OPEN=true` is set.
The gate applies regardless of auth method.

| Env var | Behavior |
|---|---|
| Neither set | Registration is closed (no one can register) |
| `REGISTRATION_ALLOWLIST=a@b.com,c@d.com` | Only listed emails may register |
| `REGISTRATION_OPEN=true` | Anyone may register (allowlist ignored) |

API returns 403 `{ error: "Registration is currently invite-only" }` when rejected.
No account data is stored for rejected attempts.

To open registration: set `REGISTRATION_OPEN=true` in Vercel environment variables.
No code change needed.

---

## Profile schema additions for auth

The `profiles` collection gains four new fields:

| Field | Type | Notes |
|---|---|---|
| `passwordHash` | `string?` | bcrypt hash. Absent = v1 user not yet migrated |
| `emailVerified` | `boolean` | Default `false`. Must be `true` to sign in |
| `verificationToken` | `string?` | Plain token for email verification lookup |
| `resetToken` | `string?` | bcrypt hash of the password reset token |

---

## Auth pages (all minimal UI, no map/nav)

| Path | Purpose |
|---|---|
| `/auth/signin` | Email+password sign-in form |
| `/auth/register` | Registration form |
| `/auth/verify` | Email verification (token from link) |
| `/auth/check-email` | "Check your email" confirmation page |
| `/auth/reset` | Password reset request form |
| `/auth/reset/confirm` | New password form (token from link) |
| `/auth/error` | Auth.js error display |

---

## Env vars summary

| Var | Required | Description |
|---|---|---|
| `AUTH_SECRET` | Yes | Auth.js JWT signing/encryption secret |
| `AUTH_URL` | Production | Canonical URL of the app |
| `RESEND_API_KEY` | Recommended | Resend API key for transactional email |
| `RESEND_FROM_EMAIL` | No | Sender address. Default: `noreply@atlasphere.app` |
| `API_URL` | Dev/Prod | URL of the Fastify API. Default: `http://localhost:3001` |
| `APP_URL` | Dev/Prod | URL of the Next.js app. Default: `http://localhost:3000` |
| `REGISTRATION_ALLOWLIST` | No | Comma-separated emails allowed to register |
| `REGISTRATION_OPEN` | No | Set to `true` to open registration to all |
