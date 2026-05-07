import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { parseEnv } from "../../env.js";
import { getAtlasContext } from "../context.js";

const MAX_DIMENSION = 1024;

export function registerUploadImageFromUrl(server: McpServer): void {
  server.registerTool(
    "upload_image_from_url",
    {
      description:
        "Fetch a public image URL, resize to 1024px max, and upload to Atlasphere's R2 bucket for durable storage. " +
        "Returns an r2Path for use in create_marker's images field. " +
        "Use this only when permanence matters — create_marker also accepts external URLs directly.",
      inputSchema: {
        url:  z.string().url().describe("Public image URL to fetch and copy"),
        name: z.string().optional().describe("Filename to store (e.g. hero.jpg); defaults to a timestamped name"),
      },
    },
    async ({ url, name }) => {
      const { user } = getAtlasContext();
      const env = parseEnv();

      // Fetch image
      const response = await fetch(url);
      if (!response.ok) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ error: `Failed to fetch image: HTTP ${response.status}` }),
          }],
          isError: true,
        };
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      // Resize to max 1024px on longest side, preserve aspect ratio, no upscaling
      const { data, info } = await sharp(buffer)
        .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
        .toBuffer({ resolveWithObject: true });

      const ext = info.format ?? "jpeg";
      const contentType = `image/${ext}`;
      const filename = name ?? `mcp-${Date.now()}.${ext}`;
      const r2Path = `accounts/${user.userId}/uploads/${filename}`;

      // Upload directly to R2 (server-side — no presign round-trip needed)
      const client = new S3Client({
        region:   "auto",
        endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId:     env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        },
      });

      await client.send(new PutObjectCommand({
        Bucket:      env.R2_BUCKET_NAME,
        Key:         r2Path,
        Body:        data,
        ContentType: contentType,
      }));

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            name:      filename,
            r2Path,
            publicUrl: `${env.R2_PUBLIC_URL}/${r2Path}`,
          }),
        }],
      };
    }
  );
}
