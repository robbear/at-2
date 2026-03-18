import { z } from "zod";

const EnvSchema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    throw new Error(`Environment validation failed: ${missing}`);
  }
  return result.data;
}
