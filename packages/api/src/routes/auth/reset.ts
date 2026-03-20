import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { PasswordResetSchema } from "@at-2/shared";
import { getProfileModel } from "../../models/profile.js";

export async function resetRoute(app: FastifyInstance): Promise<void> {
  app.post("/api/v1/auth/reset", async (request, reply) => {
    const parsed = PasswordResetSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    }

    const { token, newPassword } = parsed.data;
    const Profile = getProfileModel();

    // resetToken is a bcrypt hash — scan profiles with a resetToken set,
    // then compare with bcrypt.compare (sparse index keeps this fast)
    const candidates = await Profile.find({ resetToken: { $exists: true } });

    let matched: (typeof candidates)[number] | undefined;
    for (const candidate of candidates) {
      if (!candidate.resetToken) continue;
      const ok = await bcrypt.compare(token, candidate.resetToken);
      if (ok) {
        matched = candidate;
        break;
      }
    }

    if (!matched) {
      return reply.status(400).send({ error: "Invalid or expired reset token" });
    }

    if (!matched.resetTokenExpiresAt || matched.resetTokenExpiresAt < new Date()) {
      return reply.status(400).send({ error: "Invalid or expired reset token" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await Profile.updateOne(
      { _id: matched._id },
      {
        $set: { passwordHash, emailVerified: true },
        $unset: { resetToken: "", resetTokenExpiresAt: "" },
      }
    );

    return reply.status(200).send({ message: "Password reset successful" });
  });
}
