import { z } from "zod";

/**
 * Variables that resolve differently on Railway production vs PR environments.
 *
 * To add a new environment-specific variable:
 *   1. Add an entry here with production and dev values.
 *   2. Make the variable optional in EnvSchema (z.string().optional()).
 *   3. Add it to .env.local.example with both values documented.
 *   4. Update docs/railway-environments.md.
 *
 * Key:         env var name (must match EnvSchema key exactly)
 * production:  value when RAILWAY_ENVIRONMENT_NAME === "production"
 * dev:         value for all other Railway environments (PR envs, etc.)
 */
const RAILWAY_ENV_DEFAULTS: Record<string, { production: string; dev: string }> =
  {
    MONGODB_DB_NAME: {
      production: "atlasphere-v2",
      dev: "atlasphere-v2-dev",
    },
    R2_BUCKET_NAME: {
      production: "atlasphere-v2",
      dev: "atlasphere-v2-dev",
    },
    R2_PUBLIC_URL: {
      production: "https://pub-2c867def25774b4da3d486fe0c677f64.r2.dev",
      dev: "https://pub-63147a72c2cd47e8ab0f057c127fe103.r2.dev",
    },
  };

/**
 * Resolves a variable value using this priority order:
 *   1. Explicit value from environment (always wins — local dev, CI, manual Railway override)
 *   2. RAILWAY_ENV_DEFAULTS lookup (when running on Railway)
 *   3. Throws with a clear error message (neither source available)
 */
function resolveRailwayVar(name: string, explicit: string | undefined): string {
  if (explicit) return explicit;

  const railwayEnv = process.env["RAILWAY_ENVIRONMENT_NAME"];
  if (railwayEnv !== undefined) {
    const defaults = RAILWAY_ENV_DEFAULTS[name];
    if (!defaults) {
      throw new Error(
        `[env] ${name} is required but not set and has no entry in ` +
          `RAILWAY_ENV_DEFAULTS. Add it to RAILWAY_ENV_DEFAULTS or set it explicitly.`,
      );
    }
    const resolved =
      railwayEnv === "production" ? defaults.production : defaults.dev;
    console.log(
      `[env] ${name} resolved via RAILWAY_ENV_DEFAULTS ` +
        `(RAILWAY_ENVIRONMENT_NAME="${railwayEnv}"): ${resolved}`,
    );
    return resolved;
  }

  throw new Error(
    `[env] ${name} is required. ` +
      `Set it in .env.local (local dev) or as a GitHub Actions env var (CI).`,
  );
}

const EnvSchema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_DB_NAME: z.string().optional(),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default("noreply@atlasphere.app"),
  APP_URL: z.string().default("http://localhost:3000"),
  REGISTRATION_ALLOWLIST: z.string().optional(),
  REGISTRATION_OPEN: z.string().optional(),
  R2_ACCOUNT_ID: z.string().min(1, "R2_ACCOUNT_ID is required"),
  R2_ACCESS_KEY_ID: z.string().min(1, "R2_ACCESS_KEY_ID is required"),
  R2_SECRET_ACCESS_KEY: z.string().min(1, "R2_SECRET_ACCESS_KEY is required"),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),
});

type RawEnv = z.infer<typeof EnvSchema>;

export type Env = Omit<RawEnv, "MONGODB_DB_NAME" | "R2_BUCKET_NAME" | "R2_PUBLIC_URL"> & {
  MONGODB_DB_NAME: string;
  R2_BUCKET_NAME: string;
  R2_PUBLIC_URL: string;
  RAILWAY_ENVIRONMENT_NAME: string | undefined;
};

export function parseEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    throw new Error(`Environment validation failed: ${missing}`);
  }

  const raw = result.data;

  const railwayEnv = process.env["RAILWAY_ENVIRONMENT_NAME"];
  console.log(
    `[env] RAILWAY_ENVIRONMENT_NAME=${railwayEnv ?? "(not set — local dev or CI)"}`,
  );

  return {
    ...raw,
    MONGODB_DB_NAME: resolveRailwayVar("MONGODB_DB_NAME", raw.MONGODB_DB_NAME),
    R2_BUCKET_NAME: resolveRailwayVar("R2_BUCKET_NAME", raw.R2_BUCKET_NAME),
    R2_PUBLIC_URL: resolveRailwayVar("R2_PUBLIC_URL", raw.R2_PUBLIC_URL),
    RAILWAY_ENVIRONMENT_NAME: railwayEnv,
  };
}
