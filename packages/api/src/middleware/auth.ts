import { decode } from "@auth/core/jwt";
import { createHash } from "node:crypto";
import type { FastifyRequest, FastifyReply } from "fastify";
import { getApiKeyModel } from "../models/api-key.js";

const COOKIE_NAME = "atlasphere.session-token";

export interface SessionUser {
  id: string;
  email: string;
  userId: string; // public handle (e.g. "robbearman")
}

declare module "fastify" {
  interface FastifyRequest {
    user?: SessionUser;
  }
}

async function resolveApiKey(rawKey: string): Promise<SessionUser | null> {
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const ApiKey = getApiKeyModel();
  const doc = await ApiKey.findOneAndUpdate(
    { keyHash },
    { $set: { lastUsedAt: new Date() } },
    { new: true }
  ).lean();
  if (!doc) return null;
  return { id: doc.profileId, email: "", userId: doc.userId };
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers["authorization"];

  // API key path — used by MCP clients and direct API integrations
  if (authHeader?.startsWith("ApiKey ")) {
    const user = await resolveApiKey(authHeader.slice(7));
    if (!user) {
      await reply.status(401).send({ error: "Unauthorized" });
      return;
    }
    request.user = user;
    return;
  }

  // Bearer JWT path — used by the web frontend via Auth.js sessions
  const secret = process.env["AUTH_SECRET"];
  if (!secret) {
    await reply.status(500).send({ error: "Server misconfiguration" });
    return;
  }

  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  if (!token) {
    await reply.status(401).send({ error: "Unauthorized" });
    return;
  }

  try {
    const payload = await decode({ token, secret, salt: COOKIE_NAME });
    if (!payload?.sub || !payload.email || !payload.userId) {
      await reply.status(401).send({ error: "Unauthorized" });
      return;
    }
    request.user = {
      id:     payload.sub,
      email:  payload.email as string,
      userId: payload.userId as string,
    };
  } catch {
    await reply.status(401).send({ error: "Unauthorized" });
  }
}
