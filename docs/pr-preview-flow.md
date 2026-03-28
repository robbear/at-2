# PR Preview Environment Flow

## Overview

Every PR gets a fully isolated preview environment:

- **Railway** — spins up a temporary API service with a unique URL
- **Vercel** — builds a preview deployment of the web app

The two are connected by a GitHub Actions workflow that runs after Railway
deploys successfully.

---

## Flow

1. PR opened on GitHub
2. Railway detects the new branch and spins up a PR environment
3. Railway deploys the API, reports success to GitHub via `deployment_status`
4. GitHub Actions workflow `railway-post-deploy.yml` triggers:
   a. Extracts the Railway PR API URL from `deployment_status.environment_url`
   b. Calls the Vercel API to set `API_URL` scoped to this git branch
   c. Triggers a Vercel redeploy so the preview picks up the new `API_URL`
5. Vercel preview deployment now points at the Railway PR API

### On PR merge / close

- Railway tears down the PR environment automatically
- Vercel preview deployment expires
- The branch-scoped `API_URL` in Vercel is left behind but harmless
  (it only applies to that branch, which no longer exists)

---

## Focused PR Environments

Railway's Focused PR Environments are enabled. PRs that only touch
`packages/web` or `docs` will **not** spin up a new Railway API — they use the
production Railway URL. In this case:

- No `deployment_status` event fires from Railway for the PR branch
- The GitHub Actions workflow does not run
- The Vercel preview uses the production `API_URL` (acceptable — web-only
  changes don't need a new API instance)

---

## Required GitHub secrets

| Secret | Purpose |
|---|---|
| `VERCEL_TOKEN` | Vercel API authentication |
| `VERCEL_PROJECT_ID` | Identifies the Vercel project to update |

Add these to the repository under **Settings → Secrets and variables → Actions**.

How to obtain each:

| Secret | How to obtain |
|---|---|
| `VERCEL_TOKEN` | Vercel dashboard → Settings → Tokens → Create token |
| `VERCEL_PROJECT_ID` | Vercel project → Settings → General → Project ID |

Note: `RAILWAY_API_TOKEN` is **not** needed — the Railway PR domain comes
directly from `github.event.deployment_status.environment_url`.

---

## Debugging

The workflow's first step prints the full `github.event` payload to the
Actions log. Use this to inspect what Railway sends in `deployment_status`
if the workflow behaves unexpectedly.

To verify a successful run:

1. Open the PR's **Checks** tab on GitHub
2. Find the **"Inject Railway PR URL into Vercel"** workflow run
3. Confirm the `Set API_URL in Vercel for this branch` step returned a `200` response
4. Confirm the `Trigger Vercel redeploy for this branch` step found and redeployed a deployment
5. Open the Vercel preview URL and check that it hits the Railway PR API
