import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireAuth } from "../middleware/auth.js";
import { parseEnv } from "../env.js";

const PresignRequestSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  purpose: z.enum(["marker-image", "marker-content", "profile"]),
  markerTimestamp: z.number().optional(),
});

function buildR2Path(
  userId: string,
  purpose: "marker-image" | "marker-content" | "profile",
  filename: string,
  markerTimestamp?: number
): string {
  switch (purpose) {
    case "marker-image":
      return `accounts/${userId}/images/${markerTimestamp}/${filename}`;
    case "marker-content":
      return `accounts/${userId}/html/${markerTimestamp}.mdx`;
    case "profile":
      return `accounts/${userId}/profile/${filename}`;
  }
}

export async function uploadRoutes(app: FastifyInstance): Promise<void> {
  // -------------------------------------------------------------------------
  // POST /api/v1/upload/presign — get a presigned R2 PUT URL
  // -------------------------------------------------------------------------
  app.post(
    "/api/v1/upload/presign",
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = PresignRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid request body" });
      }

      const { filename, contentType, purpose, markerTimestamp } = parsed.data;

      if (
        (purpose === "marker-image" || purpose === "marker-content") &&
        markerTimestamp === undefined
      ) {
        return reply
          .status(400)
          .send({ error: "markerTimestamp is required for marker uploads" });
      }

      const env = parseEnv();
      const userId = request.user!.userId;
      const r2Path = buildR2Path(userId, purpose, filename, markerTimestamp);

      const client = new S3Client({
        region: "auto",
        endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        },
      });

      const command = new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: r2Path,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });

      return reply.status(200).send({
        uploadUrl,
        r2Path,
        publicUrl: `${env.R2_PUBLIC_URL}/${r2Path}`,
      });
    }
  );
}
