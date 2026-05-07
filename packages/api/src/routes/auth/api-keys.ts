import type { FastifyInstance } from "fastify";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { getApiKeyModel } from "../../models/api-key.js";

const KEY_PREFIX = "atls_";

function generateRawKey(): string {
  return KEY_PREFIX + randomBytes(32).toString("base64url");
}

function hashKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

const CreateApiKeySchema = z.object({
  label: z.string().min(1).max(100),
});

export async function apiKeysRoute(app: FastifyInstance): Promise<void> {
  // POST /api/v1/auth/api-keys — generate a new key; key value returned once only
  app.post(
    "/api/v1/auth/api-keys",
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = CreateApiKeySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid request body" });
      }

      const ApiKey = getApiKeyModel();

      const existingCount = await ApiKey.countDocuments({ userId: request.user!.userId });
      if (existingCount >= 10) {
        return reply.status(400).send({ error: "Key limit reached. Maximum 10 API keys per user." });
      }

      const rawKey = generateRawKey();
      const doc = await ApiKey.create({
        keyHash:   hashKey(rawKey),
        profileId: request.user!.id,
        userId:    request.user!.userId,
        label:     parsed.data.label,
      });

      return reply.status(201).send({
        id:        doc._id.toString(),
        key:       rawKey,
        label:     doc.label,
        createdAt: doc.createdAt,
      });
    }
  );

  // GET /api/v1/auth/api-keys — list metadata for the authenticated user's keys
  app.get(
    "/api/v1/auth/api-keys",
    { preHandler: requireAuth },
    async (request, reply) => {
      const ApiKey = getApiKeyModel();
      const keys = await ApiKey.find({ userId: request.user!.userId }).lean();
      return reply.status(200).send(
        keys.map((k) => ({
          id:         k._id.toString(),
          label:      k.label,
          createdAt:  k.createdAt,
          lastUsedAt: k.lastUsedAt,
        }))
      );
    }
  );

  // DELETE /api/v1/auth/api-keys/:id — revoke a key
  app.delete<{ Params: { id: string } }>(
    "/api/v1/auth/api-keys/:id",
    { preHandler: requireAuth },
    async (request, reply) => {
      const ApiKey = getApiKeyModel();
      const result = await ApiKey.findOneAndDelete({
        _id:    request.params.id,
        userId: request.user!.userId,
      });
      if (!result) {
        return reply.status(404).send({ error: "API key not found" });
      }
      return reply.status(200).send({ ok: true });
    }
  );
}
