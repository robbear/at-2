import type { FastifyInstance } from "fastify";
import type { FilterQuery } from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { getMarkerModel } from "../models/marker.js";
import { CreateMarkerSchema, UpdateMarkerSchema, QuerySpecSchema } from "@at-2/shared";

// Build a QuerySpec-compatible input object from flat dot-notation query params.
// e.g. ?near.lat=37.3&near.lng=-122.1&userIds=alice&userIds=bob
function parseQuerySpec(query: Record<string, string | string[]>): unknown {
  const input: Record<string, unknown> = {};

  for (const key of ["userIds", "tags", "markerIds"] as const) {
    const val = query[key];
    if (val !== undefined) {
      input[key] = Array.isArray(val) ? val : [val];
    }
  }

  if (query["allTags"] !== undefined) {
    input["allTags"] = query["allTags"] === "true";
  }

  if (query["near.lat"] !== undefined) {
    input["near"] = {
      lat: Number(query["near.lat"]),
      lng: Number(query["near.lng"]),
      ...(query["near.distance"] !== undefined
        ? { distance: Number(query["near.distance"]) }
        : {}),
    };
  }

  const drStart = query["dateRange.start"];
  const drEnd = query["dateRange.end"];
  const drUsePosttime = query["dateRange.usePosttime"];
  if (drStart !== undefined || drEnd !== undefined || drUsePosttime !== undefined) {
    input["dateRange"] = {
      ...(drStart ? { start: drStart as string } : {}),
      ...(drEnd ? { end: drEnd as string } : {}),
      ...(drUsePosttime !== undefined ? { usePosttime: drUsePosttime === "true" } : {}),
    };
  }

  return input;
}

export async function markersRoutes(app: FastifyInstance): Promise<void> {
  // -------------------------------------------------------------------------
  // GET /api/v1/markers — search / list
  // -------------------------------------------------------------------------
  app.get("/api/v1/markers", async (request, reply) => {
    const rawQuery = request.query as Record<string, string | string[]>;
    const parsed = QuerySpecSchema.safeParse(parseQuerySpec(rawQuery));
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid query parameters" });
    }

    const spec = parsed.data;
    const Marker = getMarkerModel();

    const filter: FilterQuery<object> = { deleted: false, draft: false };

    if (spec.userIds?.length) {
      filter["userId"] = { $in: spec.userIds };
    }
    if (spec.markerIds?.length) {
      filter["_id"] = { $in: spec.markerIds };
    }
    if (spec.tags?.length) {
      filter["tags"] = spec.allTags ? { $all: spec.tags } : { $in: spec.tags };
    }
    if (spec.dateRange) {
      const field = spec.dateRange.usePosttime ? "posttime" : "datetime";
      const range: Record<string, Date> = {};
      if (spec.dateRange.start) range["$gte"] = new Date(spec.dateRange.start);
      if (spec.dateRange.end) range["$lte"] = new Date(spec.dateRange.end);
      if (Object.keys(range).length) filter[field] = range;
    }

    // $nearSphere must be the only geospatial operator; apply it to location field.
    if (spec.near) {
      filter["location"] = {
        $nearSphere: {
          $geometry: { type: "Point", coordinates: [spec.near.lng, spec.near.lat] },
          $maxDistance: spec.near.distance,
        },
      };
    }

    const markers = await Marker.find(filter).limit(200).lean({ virtuals: false });
    const result = markers.map((m) => {
      const obj = { ...(m as unknown as Record<string, unknown>) };
      obj["id"] = obj["_id"];
      delete obj["_id"];
      return obj;
    });

    return reply.status(200).send(result);
  });

  // -------------------------------------------------------------------------
  // GET /api/v1/markers/:userId/:timestamp — get single marker
  // -------------------------------------------------------------------------
  app.get<{ Params: { userId: string; timestamp: string } }>(
    "/api/v1/markers/:userId/:timestamp",
    async (request, reply) => {
      const { userId, timestamp } = request.params;
      const markerId = `${userId}/${timestamp}`;
      const Marker = getMarkerModel();

      const marker = await Marker.findById(markerId).lean({ virtuals: false });
      if (!marker || (marker as unknown as Record<string, unknown>)["deleted"]) {
        return reply.status(404).send({ error: "Marker not found" });
      }

      const obj = { ...(marker as unknown as Record<string, unknown>) };
      obj["id"] = obj["_id"];
      delete obj["_id"];
      return reply.status(200).send(obj);
    }
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/markers — create
  // -------------------------------------------------------------------------
  app.post(
    "/api/v1/markers",
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = CreateMarkerSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid request body" });
      }

      const userId = request.user!.userId;
      const timestamp = Date.now();
      const markerId = `${userId}/${timestamp}`;

      const Marker = getMarkerModel();
      const marker = await Marker.create({
        _id: markerId,
        userId,
        posttime: new Date(timestamp),
        deleted: false,
        archived: false,
        ...parsed.data,
      });

      const obj = marker.toJSON() as Record<string, unknown>;
      return reply.status(201).send(obj);
    }
  );

  // -------------------------------------------------------------------------
  // PUT /api/v1/markers/:userId/:timestamp — update
  // -------------------------------------------------------------------------
  app.put<{ Params: { userId: string; timestamp: string } }>(
    "/api/v1/markers/:userId/:timestamp",
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = UpdateMarkerSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid request body" });
      }

      const { userId, timestamp } = request.params;
      const markerId = `${userId}/${timestamp}`;

      if (request.user!.userId !== userId) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const Marker = getMarkerModel();
      const marker = await Marker.findOneAndUpdate(
        { _id: markerId, deleted: false },
        { $set: parsed.data },
        { new: true }
      );

      if (!marker) {
        return reply.status(404).send({ error: "Marker not found" });
      }

      const obj = marker.toJSON() as Record<string, unknown>;
      return reply.status(200).send(obj);
    }
  );

  // -------------------------------------------------------------------------
  // DELETE /api/v1/markers/:userId/:timestamp — soft delete
  // -------------------------------------------------------------------------
  app.delete<{ Params: { userId: string; timestamp: string } }>(
    "/api/v1/markers/:userId/:timestamp",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId, timestamp } = request.params;
      const markerId = `${userId}/${timestamp}`;

      if (request.user!.userId !== userId) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const Marker = getMarkerModel();
      const marker = await Marker.findOneAndUpdate(
        { _id: markerId, deleted: false },
        { $set: { deleted: true } },
        { new: true }
      );

      if (!marker) {
        return reply.status(404).send({ error: "Marker not found" });
      }

      return reply.status(200).send({ ok: true });
    }
  );
}
