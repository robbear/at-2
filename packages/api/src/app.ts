import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { healthRoutes } from "./routes/health.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: process.env["NODE_ENV"] !== "test",
  });

  await app.register(healthRoutes);

  return app;
}
