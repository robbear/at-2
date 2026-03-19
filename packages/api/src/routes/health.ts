import type { FastifyInstance } from "fastify";
import { getDbState } from "../db.js";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/health", async (_request, reply) => {
    return reply.send({
      status: "ok",
      db: getDbState(),
    });
  });
}
