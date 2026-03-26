# Railway Environments

## Overview

The API service (`packages/api`) is deployed on Railway. Railway provides a
built-in `RAILWAY_ENVIRONMENT_NAME` variable that identifies the deployment
context:

| Context | `RAILWAY_ENVIRONMENT_NAME` |
|---|---|
| Production deployment | `"production"` |
| PR environment | `"pr-42"` (or similar branch-based name) |
| Local dev | *(absent)* |
| CI/CD | *(absent)* |

---

## Environment-specific variables

Some variables need different values in Railway production vs PR environments.
These are defined in `RAILWAY_ENV_DEFAULTS` in `packages/api/src/env.ts`.

### Current environment-specific variables

| Variable | Production | PR environments | Local / CI |
|---|---|---|---|
| `MONGODB_DB_NAME` | `atlasphere-v2` | `atlasphere-v2-dev` | from `.env.local` / CI secret |
| `R2_BUCKET_NAME` | `atlasphere-v2` | `atlasphere-v2-dev` | from `.env.local` / CI secret |
| `R2_PUBLIC_URL` | production R2 URL | dev R2 URL | from `.env.local` / CI secret |

---

## Resolution priority

For each environment-specific variable, `parseEnv()` resolves the value using
this priority order:

1. **Explicit value set in environment** — always wins. Use this for local dev
   (`.env.local`), CI (GitHub Actions secrets), or manual Railway overrides.
2. **`RAILWAY_ENV_DEFAULTS` lookup** — used when `RAILWAY_ENVIRONMENT_NAME` is
   set (i.e. running on Railway) and no explicit value is provided.
3. **Error** — if neither source is available, startup fails with a clear
   message.

---

## How to add a new environment-specific variable

**Four steps, four places:**

1. **`packages/api/src/env.ts`** — add an entry to `RAILWAY_ENV_DEFAULTS`:
   ```ts
   MY_NEW_VAR: {
     production: "production-value",
     dev:        "dev-value",
   },
   ```

2. **`packages/api/src/env.ts`** — make it optional in `EnvSchema`:
   ```ts
   MY_NEW_VAR: z.string().optional(),
   ```

3. **`packages/api/src/env.ts`** — resolve it in `parseEnv()` and add it to
   the `Env` type:
   ```ts
   MY_NEW_VAR: resolveRailwayVar("MY_NEW_VAR", raw.MY_NEW_VAR),
   ```

4. **`.env.local.example`** — document both values:
   ```
   # Production: production-value | Dev/PR: dev-value
   # Required locally and in CI. Auto-resolved on Railway via RAILWAY_ENV_DEFAULTS.
   MY_NEW_VAR=dev-value
   ```

5. **This file** — update the table above.

---

## Railway Variables UI

Environment-specific variables do **not** need to be set manually in the
Railway Variables tab. They are resolved in code via `RAILWAY_ENV_DEFAULTS`.

Only set a variable explicitly in the Railway UI if you need to override the
`RAILWAY_ENV_DEFAULTS` value for a specific deployment (e.g. a hotfix or
temporary override).

---

## Startup logs

Every startup logs the Railway context and all resolved env-specific variables:

```
[env] RAILWAY_ENVIRONMENT_NAME=production
[env] MONGODB_DB_NAME resolved via RAILWAY_ENV_DEFAULTS (RAILWAY_ENVIRONMENT_NAME="production"): atlasphere-v2
[env] R2_BUCKET_NAME resolved via RAILWAY_ENV_DEFAULTS (RAILWAY_ENVIRONMENT_NAME="production"): atlasphere-v2
[env] R2_PUBLIC_URL resolved via RAILWAY_ENV_DEFAULTS (RAILWAY_ENVIRONMENT_NAME="production"): https://...
```

Check Railway's deployment logs to confirm which values are in use.
