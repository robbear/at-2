# Incident: Railway env-var breach (October 2026)

**Status: Atlasphere is offline (maintenance mode) as of 2026-10-22.**

Sensitive specifics (database user names, token names, which credential lives
where) are kept as comments in the private `.env.local`, not here.

---

## What happened

On 2026-10-21 Railway [disclosed](https://blog.railway.com/p/security-disclosure-wednesday-october-21st)
that an attacker accessed the systems storing customer environment variables,
in some cases obtaining decrypted values. Railway recommended rotating every
variable stored on the platform, paused all deployments, and had not declared
the issue mitigated. Vercel disabled the Railway integration for this project.

Every secret in the Railway API service was treated as compromised:
`MONGODB_URI`, `AUTH_SECRET`, `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`,
`RESEND_API_KEY`.

## Why the site was shut down rather than re-keyed

- Railway deploys were paused, so the API could not be redeployed with new
  secrets — and Railway was not yet trusted to hold them.
- The running API kept the leaked `AUTH_SECRET`. Anyone holding it can forge an
  Auth.js session for any user and write through the API. Rotating the secret
  on Vercel does not affect the Railway process.
- The only lever that neutralized the running API was cutting off its database
  access.

## What was done

| Item | Action |
|---|---|
| Web (Vercel) | `MAINTENANCE_MODE=true` → `src/middleware.ts` serves a static 503 vacation page for all routes (PR #75) |
| MongoDB | API's database user deleted. New least-privilege users created for the portal and CI only. No dev or prod user exists. |
| R2 | Bucket token rolled (old secret invalid) |
| Resend | Key deleted and recreated; new key in portal only |
| `AUTH_SECRET` | Regenerated; set in Vercel only |
| Portal | Updated with new MongoDB, Resend, and Cloudflare values; stays online. Railway panel intentionally left erroring (Railway token revoked). |
| CI | `MONGODB_URI_TEST` GitHub secret updated; CI verified green |

Verified: the Railway API's `/api/v1/markers` returns 500
(`cannot find user account after reload`). Note that `/api/v1/health` still
reports `db: connected` — it reflects socket state only and is not proof of access.

## Lessons

- **Changing a MongoDB user's password does not cut off already-open
  connections.** The Railway API kept reading production after the password
  change. Deleting the user (or reducing its roles) takes effect on existing
  connections. Verify with a real query, not the health check.
- **Deployed apps must never use an admin database user.** The API previously
  connected as an `atlasAdmin` user shared with local dev. Each context now gets
  its own user scoped to its own database.
- Atlas database users are separate from the Atlas console login — deleting all
  database users does not lock the owner out (Data Explorer still works).

## Relaunch checklist

1. **Decide the API host** — Railway again (only once it has declared full
   mitigation) or Vercel serverless (the original stack plan; check the MCP
   server and compute cost implications, see PR #73).
2. **Create MongoDB users** (never `atlasAdmin` for apps):
   - prod API — `readWrite` on `atlasphere-v2` only
   - PR/preview API (if kept) — `readWrite` on `atlasphere-v2-dev` only
   - local dev — `readWrite` on `atlasphere-v2-dev` only
   - personal admin access, if needed — separate name, ideally an Atlas
     temporary user with an expiry
3. **Set API secrets on the new host:** `MONGODB_URI`, the current R2 key pair,
   `RESEND_API_KEY`, and an `AUTH_SECRET` that matches Vercel's web value.
4. **Update local `.env.local`** with the new dev user (local dev and API tests
   do not run until this is done).
5. **PR previews:** the Railway→Vercel `API_URL` injection
   (`.github/workflows/railway-post-deploy.yml`, `/docs/pr-preview-flow.md`)
   depended on the integration Vercel disabled — restore or replace it.
6. **Portal Railway panel:** issue a new Railway token or remove the panel.
7. **Remove `MAINTENANCE_MODE`** from Vercel and redeploy. Smoke-test login,
   marker create/edit, and image upload.
8. Optionally decommission the old Railway service/project.
