import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { getProfileModel } from "../models/profile.js";

const UpdateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  bio: z.string().optional(),
  profilePicUrl: z.string().optional(),
});

export async function profilesRoutes(app: FastifyInstance): Promise<void> {
  // -------------------------------------------------------------------------
  // GET /api/v1/profiles/:userId — public profile
  // -------------------------------------------------------------------------
  app.get<{ Params: { userId: string } }>(
    "/api/v1/profiles/:userId",
    async (request, reply) => {
      const { userId } = request.params;
      const Profile = getProfileModel();

      const profile = await Profile.findOne({ userId }).lean();
      if (!profile) {
        return reply.status(404).send({ error: "Profile not found" });
      }

      return reply.status(200).send({
        userId: profile.userId,
        name: profile.name,
        profilePicUrl: profile.profilePicUrl ?? null,
        bio: profile.bio ?? null,
        createdAt: profile.createdAt,
      });
    }
  );

  // -------------------------------------------------------------------------
  // PUT /api/v1/profiles/:userId — update profile (owner only)
  // -------------------------------------------------------------------------
  app.put<{ Params: { userId: string } }>(
    "/api/v1/profiles/:userId",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = request.params;

      if (request.user!.userId !== userId) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const parsed = UpdateProfileSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid request body" });
      }

      const Profile = getProfileModel();
      const profile = await Profile.findOneAndUpdate(
        { userId },
        { $set: parsed.data },
        { new: true }
      ).lean();

      if (!profile) {
        return reply.status(404).send({ error: "Profile not found" });
      }

      return reply.status(200).send({
        userId: profile.userId,
        name: profile.name,
        profilePicUrl: profile.profilePicUrl ?? null,
        bio: profile.bio ?? null,
        createdAt: profile.createdAt,
      });
    }
  );
}
