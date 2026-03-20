import type { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { PasswordResetRequestSchema } from "@at-2/shared";
import { getProfileModel } from "../../models/profile.js";
import { sendPasswordResetEmail } from "../../services/email.js";
import { parseEnv } from "../../env.js";

export async function resetRequestRoute(app: FastifyInstance): Promise<void> {
  app.post("/api/v1/auth/reset-request", async (request, reply) => {
    const env = parseEnv();
    const parsed = PasswordResetRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input" });
    }

    const { email } = parsed.data;
    const Profile = getProfileModel();
    const profile = await Profile.findOne({ email });

    // Always return 200 to avoid leaking which emails are registered
    if (!profile) {
      return reply.status(200).send({ message: "If that email is registered, a reset link has been sent." });
    }

    const rawToken = randomUUID();
    const tokenHash = await bcrypt.hash(rawToken, 12);

    await Profile.updateOne(
      { _id: profile._id },
      {
        $set: {
          resetToken: tokenHash,
          resetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      }
    );

    await sendPasswordResetEmail(email, rawToken, env);

    return reply.status(200).send({ message: "If that email is registered, a reset link has been sent." });
  });
}
