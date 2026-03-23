import { decode } from "@auth/core/jwt";
import type { FastifyRequest, FastifyReply } from "fastify";

// Salt must match the custom cookie name set in packages/web/src/auth.ts
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

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const secret = process.env["AUTH_SECRET"];
  if (!secret) {
    await reply.status(500).send({ error: "Server misconfiguration" });
    return;
  }

  const authHeader = request.headers["authorization"];
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  if (!token) {
    await reply.status(401).send({ error: "Unauthorized" });
    return;
  }

  try {
    const payload = await decode({
      token,
      secret,
      salt: COOKIE_NAME,
    });

    if (!payload?.sub || !payload.email || !payload.userId) {
      await reply.status(401).send({ error: "Unauthorized" });
      return;
    }

    request.user = {
      id: payload.sub,
      email: payload.email as string,
      userId: payload.userId as string,
    };
  } catch {
    await reply.status(401).send({ error: "Unauthorized" });
  }
}
