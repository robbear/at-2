import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMarkerModel } from "../../models/marker.js";
import { getAtlasContext } from "../context.js";

export function registerDeleteMarker(server: McpServer): void {
  server.registerTool(
    "delete_marker",
    {
      description: "Soft-delete a marker by ID. Only the authenticated user's own markers may be deleted.",
      inputSchema: {
        markerId: z.string().describe("Marker ID in {userId}/{timestamp} format"),
      },
    },
    async ({ markerId }) => {
      const { user } = getAtlasContext();

      const [ownerUserId] = markerId.split("/");
      if (ownerUserId !== user.userId) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Forbidden" }) }],
          isError: true,
        };
      }

      const Marker = getMarkerModel();
      const marker = await Marker.findOneAndUpdate(
        { _id: markerId, deleted: false },
        { $set: { deleted: true } },
        { new: true }
      );

      if (!marker) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Marker not found" }) }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify({ ok: true, id: markerId }) }],
      };
    }
  );
}
