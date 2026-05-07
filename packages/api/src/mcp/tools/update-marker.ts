import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMarkerModel } from "../../models/marker.js";
import { getAtlasContext } from "../context.js";

export function registerUpdateMarker(server: McpServer): void {
  server.registerTool(
    "update_marker",
    {
      description: "Update fields on an existing marker. Only the authenticated user's own markers may be updated.",
      inputSchema: {
        markerId:     z.string().describe("Marker ID in {userId}/{timestamp} format"),
        title:        z.string().optional(),
        content:      z.string().optional().describe("MDX markdown body"),
        lat:          z.number().min(-90).max(90).optional(),
        lng:          z.number().min(-180).max(180).optional(),
        tags:         z.array(z.string()).optional(),
        snippetText:  z.string().optional(),
        snippetImage: z.string().optional(),
        datetime:     z.string().optional().describe("ISO 8601"),
        draft:        z.boolean().optional(),
        archived:     z.boolean().optional(),
      },
    },
    async (params) => {
      const { user } = getAtlasContext();
      const { markerId, content, lat, lng, datetime, ...rest } = params;

      const [ownerUserId] = markerId.split("/");
      if (ownerUserId !== user.userId) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Forbidden" }) }],
          isError: true,
        };
      }

      const update: Record<string, unknown> = { ...rest };
      if (content !== undefined)   update["markdown"] = content;
      if (datetime !== undefined)  update["datetime"] = new Date(datetime);
      if (lat !== undefined && lng !== undefined) {
        update["location"] = { type: "Point", coordinates: [lng, lat] };
      }

      const Marker = getMarkerModel();
      const marker = await Marker.findOneAndUpdate(
        { _id: markerId, deleted: false },
        { $set: update },
        { new: true }
      );

      if (!marker) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Marker not found" }) }],
          isError: true,
        };
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ id: markerId }),
        }],
      };
    }
  );
}
