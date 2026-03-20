import type { FastifyInstance } from "fastify";
import { VerifyEmailSchema } from "@at-2/shared";
import { getProfileModel } from "../../models/profile.js";

export async function verifyEmailRoute(app: FastifyInstance): Promise<void> {
  app.post("/api/v1/auth/verify-email", async (request, reply) => {
    const parsed = VerifyEmailSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    }

    const { token } = parsed.data;
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
