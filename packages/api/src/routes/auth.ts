import type { FastifyInstance } from "fastify";
import { registerRoute } from "./auth/register.js";
import { credentialsRoute } from "./auth/credentials.js";
import { verifyEmailRoute } from "./auth/verify-email.js";
import { resetRequestRoute } from "./auth/reset-request.js";
import { resetRoute } from "./auth/reset.js";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  await registerRoute(app);
  await credentialsRoute(app);
  await verifyEmailRoute(app);
  await resetRequestRoute(app);
  await resetRoute(app);
}
