import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMarkerModel } from "../../models/marker.js";
import { getAtlasContext } from "../context.js";

export function registerCreateMarker(server: McpServer): void {
  server.registerTool(
    "create_marker",
    {
      description:
        "Create a geo-tagged marker with title, MDX body, coordinates, tags, and images. " +
        "Images may be external URLs (stored as-is) or R2 asset references returned by upload_image_from_url.",
      inputSchema: {
        title:        z.string().min(1).describe("Marker title"),
        content:      z.string().describe("MDX markdown body"),
        lat:          z.number().min(-90).max(90).describe("Latitude"),
        lng:          z.number().min(-180).max(180).describe("Longitude"),
        tags:         z.array(z.string()).optional().describe("Tags for filtering and search"),
        images: z.array(
          z.object({
            name:   z.string().optional().describe("Image filename, e.g. hero.jpg"),
            url:    z.string().optional().describe("External image URL (no R2 copy)"),
            r2Path: z.string().optional().describe("R2 path from upload_image_from_url"),
          })
        ).optional().describe("Images: provide url for external or r2Path for R2-backed"),
        snippetText:  z.string().optional().describe("Short preview text"),
        snippetImage: z.string().optional().describe("Preview image URL"),
        datetime:     z.string().optional().describe("ISO 8601 date for the event/place; defaults to now"),
        draft:        z.boolean().optional().describe("Save as draft (not publicly visible)"),
      },
    },
    async (params) => {
      const { user } = getAtlasContext();
      const timestamp = Date.now();
      const markerId = `${user.userId}/${timestamp}`;

      const images = (params.images ?? []).map((img, i) => {
        const name = img.name ?? `${i + 1}.jpg`;
        if (img.r2Path) return { name, r2Path: img.r2Path };
        if (img.url)    return { name, url: img.url };
        return { name, url: "" };
      });

      const Marker = getMarkerModel();
      const marker = await Marker.create({
        _id:      markerId,
        userId:   user.userId,
        posttime: new Date(timestamp),
        datetime: params.datetime ? new Date(params.datetime) : new Date(timestamp),
        title:        params.title,
        markdown:     params.content,
        snippetText:  params.snippetText ?? "",
        snippetImage: params.snippetImage ?? (images[0]?.url ?? ""),
        contentUrl:   "",
        tags:         params.tags ?? [],
        images,
        location: {
          type:        "Point",
          coordinates: [params.lng, params.lat],
        },
        draft:    params.draft ?? false,
        archived: false,
        deleted:  false,
      });

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            id:  markerId,
            url: `https://atlasphere.app/${markerId}`,
          }),
        }],
      };
    }
  );
}
