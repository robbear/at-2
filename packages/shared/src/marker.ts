import { z } from "zod";

/**
 * Converts a Date to the marker timestamp format: YYYYMMDDHHMMssSSS (17 chars, UTC).
 * Human-readable in URLs, sorts chronologically, supports sub-second uniqueness
 * for batch marker creation.
 */
export function toMarkerTimestamp(date: Date = new Date()): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    pad(date.getUTCMilliseconds(), 3)
  );
}

export const GeoPointSchema = z.object({
  type: z.literal("Point"),
  coordinates: z.tuple([z.number(), z.number()]), // [lng, lat]
});

export const MarkerColorsSchema = z.object({
  rgbFill: z.string(),
  rgbOutline: z.string(),
});

// R2-backed image: uploaded to Atlasphere's R2 bucket (durable)
export const MarkerImageR2Schema = z.object({
  name:   z.string(), // sequential name: "1.jpg", "2.jpg", etc.
  r2Path: z.string(), // full R2 storage path
});

// External URL image: stored as-is, not copied to R2 (link rot accepted)
export const MarkerImageUrlSchema = z.object({
  name: z.string(),
  url:  z.string(),
});

export const MarkerImageSchema = z.union([MarkerImageR2Schema, MarkerImageUrlSchema]);
export const MarkerImageArraySchema = z.array(MarkerImageSchema);

export const MarkerSchema = z.object({
  id: z.string(), // {userId}/{timestamp}
  userId: z.string(),
  title: z.string(),
  snippetText: z.string(),
  snippetImage: z.string(),
  contentUrl: z.string(),
  markdown: z.string(),
  tags: z.array(z.string()),
  images: MarkerImageArraySchema.default([]),
  location: GeoPointSchema,
  datetime: z.coerce.date(),
  posttime: z.coerce.date(),
  layerUrl: z.string().optional(),
  layerType: z.enum(["kml", "geojson"]).nullable().optional(),
  markerColors: MarkerColorsSchema.nullable().optional(),
  hideSnippetImageInDetails: z.boolean().optional(),
  draft: z.boolean(),
  archived: z.boolean(),
  deleted: z.boolean(),
});

export const CreateMarkerSchema = z.object({
  title: z.string().min(1),
  snippetText: z.string().default(""),
  snippetImage: z.string().default(""),
  contentUrl: z.string().default(""),
  markdown: z.string().default(""),
  tags: z.array(z.string()).default([]),
  images: MarkerImageArraySchema.default([]),
  location: GeoPointSchema,
  datetime: z.coerce.date(),
  layerUrl: z.string().optional(),
  layerType: z.enum(["kml", "geojson"]).nullable().optional(),
  markerColors: MarkerColorsSchema.optional(),
  hideSnippetImageInDetails: z.boolean().optional(),
  draft: z.boolean().default(false),
});

export const UpdateMarkerSchema = CreateMarkerSchema.partial().extend({
  archived: z.boolean().optional(),
  markerColors: MarkerColorsSchema.nullable().optional(),
  hideSnippetImageInDetails: z.boolean().nullable().optional(),
});

export type GeoPoint = z.infer<typeof GeoPointSchema>;
export type MarkerColors = z.infer<typeof MarkerColorsSchema>;
export type MarkerImageR2 = z.infer<typeof MarkerImageR2Schema>;
export type MarkerImageUrl = z.infer<typeof MarkerImageUrlSchema>;
export type MarkerImage = z.infer<typeof MarkerImageSchema>;
export type Marker = z.infer<typeof MarkerSchema>;
export type CreateMarker = z.infer<typeof CreateMarkerSchema>;
export type UpdateMarker = z.infer<typeof UpdateMarkerSchema>;
