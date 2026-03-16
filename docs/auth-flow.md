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

## OAuth providers

TBD — to be configured in Auth.js. Likely candidates: Google, GitHub.
Email/password (credentials provider) should also be supported.

---

## Env vars summary

| Var | Description |
|---|---|
| `AUTH_SECRET` | Auth.js secret (required) |
| `AUTH_URL` | Canonical URL of the app (required in production) |
| `REGISTRATION_ALLOWLIST` | Comma-separated allowed emails |
| `REGISTRATION_OPEN` | `true` to open registration to all |
