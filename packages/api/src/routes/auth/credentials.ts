import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { CredentialsSchema } from "@at-2/shared";
import { getProfileModel } from "../../models/profile.js";

export async function credentialsRoute(app: FastifyInstance): Promise<void> {
  app.post("/api/v1/auth/credentials", async (request, reply) => {
    const parsed = CredentialsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input" });
    }

    const { email, password } = parsed.data;
    const Profile = getProfileModel();

    const profile = await Profile.findOne({ email });
    if (!profile) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    if (!profile.passwordHash) {
      // v1 user who hasn't set a password yet — direct them to reset flow
      return reply.status(401).send({
        error: "Password not set. Use the password reset flow to create a password.",
        code: "NO_PASSWORD",
      });
    }

    if (!profile.emailVerified) {
      return reply.status(401).send({
        error: "Email not verified. Check your inbox for the verification link.",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    const valid = await bcrypt.compare(password, profile.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    return reply.status(200).send({
      id: profile._id,
      email: profile.email,
      name: profile.name,
    });
  });
}
