import type { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { RegistrationSchema } from "@at-2/shared";
import { getProfileModel } from "../../models/profile.js";
import { isEmailAllowed } from "../../services/registration-gate.js";
import { sendVerificationEmail } from "../../services/email.js";
import { parseEnv } from "../../env.js";

export async function registerRoute(app: FastifyInstance): Promise<void> {
  app.post("/api/v1/auth/register", async (request, reply) => {
    const env = parseEnv();
    const parsed = RegistrationSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    }

    const { email, password } = parsed.data;

    if (!isEmailAllowed(email, env)) {
      return reply
        .status(403)
        .send({ error: "Registration is not open for this email address" });
    }

    const Profile = getProfileModel();

    const existing = await Profile.findOne({ email });
    if (existing) {
      return reply.status(409).send({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = randomUUID();
    const id = randomUUID();
    const userId = id; // public handle defaults to the same UUID until user updates it

    await Profile.create({
      _id: id,
      userId,
      email,
      name: email.split("@")[0] ?? email,
      createdAt: new Date(),
      passwordHash,
      emailVerified: false,
      verificationToken,
    });

    await sendVerificationEmail(email, verificationToken, env);

    return reply.status(201).send({ message: "Registration successful. Check your email to verify your account." });
  });
}
