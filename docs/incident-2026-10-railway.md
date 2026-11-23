# Incident: Railway env-var breach (October 2026)

**Status: Atlasphere is decommissioned as of 2026-11-23.** The site has been
offline (maintenance mode) since 2026-10-22. All paid backend accounts are
closed, and every service credential has been revoked. See
[Decommission record](#decommission-record-november-2026) for what remains open
and where the data archive lives.

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

> Since the November 2026 decommission, a relaunch means creating **new**
> accounts for every backend service and restoring from the Drive archive
> (see `RESTORE.md` inside it). The steps below still apply.

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

---

## Decommission record (November 2026)

After the incident, the owner decided to shut Atlasphere down completely.
Credit-card-backed APIs had become an attractive target for automated (AI)
attacks. The goal: no account tied to Atlasphere can cause billing charges, and
nothing needs to be shut down by anyone else later.

### Data archive

All Atlasphere v2 data was archived on 2026-11-20 to the owner's Google Drive
(hyperfine.com account) as `atlasphere-archive-2026-11.zip` (188 MB). It
contains:

- the production and dev MongoDB databases
- both R2 buckets
- the v1 AWS S3 media bucket, which 79 production markers still reference

`RESTORE.md` inside the zip explains how to rehydrate each piece. The archive
contains user emails and password hashes and must stay private. It contains no
credentials. The `atlasphere-v1-archive` Atlas cluster (below) is **not** in the
archive.

### Closed or emptied

| Service | State |
|---|---|
| Railway | Project and account deleted |
| MongoDB Atlas, v2 | Paid cluster and the Atlasphere V2 project deleted (including its database users). Admin API key deleted. |
| Cloudflare | R2 buckets, tokens and the `atlasphere-cdn.app` zone deleted. **Remove the card after 2026-12-18**, when the subscription ends. |
| AWS | S3 buckets, Cognito resources and Atlasphere IAM users/roles deleted |
| Mapbox | All tokens revoked |
| Google Maps | API keys deleted; Maps JavaScript API disabled |
| Resend, PostHog | Keys revoked; no card accessible |
| Vercel | Portal project and both API tokens deleted |
| Heroku | v1 app deleted; no card on file |
| GitHub | Actions secrets deleted, portal PAT revoked, Railway app removed. Repo archived (read-only). |

Every old credential was tested after revocation (2026-11-23) and returns
unauthorized or not-found.

### Deliberately kept open

| Account | Why | Billing |
|---|---|---|
| GoDaddy | Registrar for `atlasphere.app` and `atlasphere-cdn.app` | Annual auto-renew. To end it, turn off auto-renew and let the domains lapse. |
| DNS Made Easy | DNS for `atlasphere.app`, including Google Workspace MX records | Paid subscription |
| Google Workspace / Cloud | `rob@atlasphere.app` email; GCP billing account is shared with other projects | Ongoing |
| Vercel (Hobby) | Serves the vacation page on `atlasphere.app` | Free; no card |
| MongoDB Atlas | Atlasphere V1 project holds the free `atlasphere-v1-archive` cluster (v1 data) | Free tier |
| AWS | Shared with the owner's Hyperfine business; a $0 budget alert is configured | No Atlasphere resources remain |
| Heroku | Other no-charge apps | No card |

`atlasphere-cdn.app` nameservers were moved back to GoDaddy before the
Cloudflare zone was deleted, to avoid a dangling-nameserver takeover.
