import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { requireAuth } from "./middleware/auth.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: process.env["NODE_ENV"] !== "test",
  });

  await app.register(healthRoutes);
  await app.register(authRoutes);

  // Test-only protected route for verifying auth middleware
  if (process.env["NODE_ENV"] === "test") {
    app.get(
      "/api/v1/test/protected",
      { preHandler: requireAuth },
      async (request) => {
        return { userId: request.user?.id };
      }
    );
  }

  return app;
}
