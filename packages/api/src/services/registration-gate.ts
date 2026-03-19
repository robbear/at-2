import type { Env } from "../env.js";

export function isEmailAllowed(
  email: string,
  env: Pick<Env, "REGISTRATION_ALLOWLIST" | "REGISTRATION_OPEN">
): boolean {
  if (env.REGISTRATION_OPEN === "true") {
    return true;
  }

  if (!env.REGISTRATION_ALLOWLIST) {
    return false;
  }

  const allowed = env.REGISTRATION_ALLOWLIST.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return allowed.includes(email.toLowerCase());
}
