import type { FastifyInstance } from "fastify";
import { getProfileModel } from "../../models/profile.js";

export async function verifyEmailRoute(app: FastifyInstance): Promise<void> {
  app.post("/api/v1/auth/verify-email", async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const token = typeof body?.token === "string" ? body.token : undefined;

    if (!token) {
      return reply.status(400).send({ error: "token is required" });
    }

    const Profile = getProfileModel();
    const profile = await Profile.findOne({ verificationToken: token });

    if (!profile) {
      return reply.status(400).send({ error: "Invalid or expired verification token" });
    }

    await Profile.updateOne(
      { _id: profile._id },
      { $set: { emailVerified: true }, $unset: { verificationToken: "" } }
    );

    return reply.status(200).send({ message: "Email verified successfully" });
  });
}
