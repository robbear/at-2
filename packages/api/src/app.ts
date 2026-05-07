import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { markersRoutes } from "./routes/markers.js";
import { profilesRoutes } from "./routes/profiles.js";
import { uploadRoutes } from "./routes/upload.js";
import { mcpRoutes } from "./routes/mcp.js";
import { requireAuth } from "./middleware/auth.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: process.env["NODE_ENV"] !== "test",
  });

  // Allow requests from the web frontend. APP_URL defaults to localhost:3000
  // in local dev and is set to the Vercel deployment URL in production/preview.
  await app.register(cors, {
    origin: process.env["APP_URL"] ?? "http://localhost:3000",
    credentials: true,
  });

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(markersRoutes);
  await app.register(profilesRoutes);
  await app.register(uploadRoutes);
  await app.register(mcpRoutes);

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
