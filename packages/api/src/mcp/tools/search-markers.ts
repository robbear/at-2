import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FilterQuery } from "mongoose";
import { getMarkerModel } from "../../models/marker.js";

export function registerSearchMarkers(server: McpServer): void {
  server.registerTool(
    "search_markers",
    {
      description: "Search and filter Atlasphere markers. Returns matching markers as JSON.",
      inputSchema: {
        userIds:  z.array(z.string()).optional().describe("Filter by user handle(s)"),
        tags:     z.array(z.string()).optional().describe("Filter by tags"),
        allTags:  z.boolean().optional().describe("When true, marker must have ALL listed tags (default: any)"),
        markerIds:z.array(z.string()).optional().describe("Fetch specific markers by ID"),
        near: z.object({
          lat:      z.number(),
          lng:      z.number(),
          distance: z.number().optional().describe("Max distance in metres (default 5000)"),
        }).optional().describe("Geo-proximity filter"),
        dateRange: z.object({
          start:       z.string().optional().describe("ISO 8601 start date"),
          end:         z.string().optional().describe("ISO 8601 end date"),
          usePosttime: z.boolean().optional().describe("Filter on posttime instead of event datetime"),
        }).optional(),
        limit: z.number().min(1).max(200).optional().describe("Max results (default 50)"),
      },
    },
    async (params) => {
      const Marker = getMarkerModel();
      const filter: FilterQuery<object> = { deleted: false, draft: false };
      const primaryClauses: FilterQuery<object> = {};

      if (params.userIds?.length) {
        primaryClauses["userId"] = { $in: params.userIds };
      }
      if (params.tags?.length) {
        primaryClauses["tags"] = params.allTags
          ? { $all: params.tags }
          : { $in: params.tags };
      }
      if (params.dateRange) {
        const field = params.dateRange.usePosttime ? "posttime" : "datetime";
        const range: Record<string, Date> = {};
        if (params.dateRange.start) range["$gte"] = new Date(params.dateRange.start);
        if (params.dateRange.end)   range["$lte"] = new Date(params.dateRange.end);
        if (Object.keys(range).length) primaryClauses[field] = range;
      }
      if (params.near) {
        filter["location"] = {
          $nearSphere: {
            $geometry: { type: "Point", coordinates: [params.near.lng, params.near.lat] },
            $maxDistance: params.near.distance ?? 5000,
          },
        };
      }

      if (params.markerIds?.length && Object.keys(primaryClauses).length > 0) {
        filter["$or"] = [primaryClauses, { _id: { $in: params.markerIds } }];
      } else if (params.markerIds?.length) {
        filter["_id"] = { $in: params.markerIds };
      } else {
        Object.assign(filter, primaryClauses);
      }

      const markers = await Marker.find(filter)
        .limit(params.limit ?? 50)
        .lean({ virtuals: false });

      const result = markers.map((m) => {
        const obj = { ...(m as unknown as Record<string, unknown>) };
        obj["id"] = obj["_id"];
        delete obj["_id"];
        return obj;
      });

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(result),
        }],
      };
    }
  );
}
