# Auth Flow

Authentication is handled by **Auth.js** (formerly NextAuth.js), replacing AWS Cognito from v1.

---

## Session handling

- Auth.js is configured in `/packages/web` (Next.js App Router)
- Session strategy: JWT (no DB session table needed — keeps costs minimal)
- Session is accessible server-side via `auth()` and client-side via `useSession()`
- The API (`/packages/api`) validates requests using the Auth.js session token
  passed as a Bearer token in the `Authorization` header

---

## Write authorization

All write endpoints (`POST`, `PUT`, `PATCH`, `DELETE`) require:
1. A valid Auth.js session token
2. The authenticated user's `userId` must match the `userId` on the resource
   being written — you cannot create or modify content on behalf of another user

---

## Registration gating

Account creation is gated until `REGISTRATION_OPEN=true` is set.

### Flow (gated mode)

1. User submits signup form with email + password (or OAuth)
2. Before creating the account, the server checks `REGISTRATION_ALLOWLIST`
3. If the email is in the allowlist → account is created, user is signed in
4. If the email is NOT in the allowlist → registration is rejected with a
   friendly message (e.g. "Atlasphere is currently invite-only")
5. No account is created; no data is stored for rejected attempts

### Env vars

| Var | Description |
|---|---|
| `REGISTRATION_ALLOWLIST` | Comma-separated list of allowed emails |
| `REGISTRATION_OPEN` | Set to `true` to disable the gate entirely |

### Removing the gate

Set `REGISTRATION_OPEN=true` in Vercel environment variables. The allowlist
check is skipped entirely — no code change required.

---

## v1 account migration

v1 accounts were email+password credentials stored in AWS Cognito. Password hashes
are not exportable from Cognito — a credential migration is impossible.

### Migration strategy: email-matched profile linking

v2 uses Google OAuth. On a user's first Google sign-in, the API checks whether a
MongoDB profile already exists for that Google account email:

- **Match found** — the existing v1 profile is linked to the new Google identity.
  The user's `_id` is updated to the Auth.js Google sub, but `userId`, markers,
  and all content are preserved. Transparent to the user.
- **No match** — a fresh profile is created as a new v2 account.

### Practical rollout

Since all v1 users are known personally, they can be told directly:
> "v2 uses Google sign-in — use the same email address you registered with."

Edge case: a v1 user whose Google account email differs from their Cognito email.
Handle these individually given the small user base.

### Cognito sunset

Once all known v1 users have migrated to v2, the Cognito User Pool and Identity
Pool can be decommissioned. There is no automated cutover — this is a manual
decision once v2 is stable.

---

## OAuth providers

**Google OAuth only** for initial launch. Apple and email/password may be added
later as the user base grows.

Auth.js Google provider requires:
- A Google Cloud project with the OAuth 2.0 credentials configured
- Authorized redirect URI: `{AUTH_URL}/api/auth/callback/google`

---

## Env vars summary

| Var | Description |
|---|---|
| `AUTH_SECRET` | Auth.js secret (required) |
| `AUTH_URL` | Canonical URL of the app (required in production) |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `REGISTRATION_ALLOWLIST` | Comma-separated allowed emails |
| `REGISTRATION_OPEN` | `true` to open registration to all |
