import { z } from "zod";

export const GeoPointSchema = z.object({
  type: z.literal("Point"),
  coordinates: z.tuple([z.number(), z.number()]), // [lng, lat]
});

export const MarkerColorsSchema = z.object({
  fill: z.string(),
  outline: z.string(),
});

export const MarkerSchema = z.object({
  id: z.string(), // {userId}/{timestamp}
  userId: z.string(),
  title: z.string(),
  snippetText: z.string(),
  snippetImage: z.string(),
  contentUrl: z.string(),
  markdown: z.string(),
  tags: z.array(z.string()),
  location: GeoPointSchema,
  datetime: z.coerce.date(),
  posttime: z.coerce.date(),
  layerUrl: z.string().optional(),
  layerType: z.enum(["kml", "geojson"]).nullable().optional(),
  markerColors: MarkerColorsSchema.optional(),
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
  location: GeoPointSchema,
  datetime: z.coerce.date(),
  layerUrl: z.string().optional(),
  layerType: z.enum(["kml", "geojson"]).nullable().optional(),
  markerColors: MarkerColorsSchema.optional(),
  draft: z.boolean().default(false),
});

export const UpdateMarkerSchema = CreateMarkerSchema.partial().extend({
  archived: z.boolean().optional(),
});

export type GeoPoint = z.infer<typeof GeoPointSchema>;
export type MarkerColors = z.infer<typeof MarkerColorsSchema>;
export type Marker = z.infer<typeof MarkerSchema>;
export type CreateMarker = z.infer<typeof CreateMarkerSchema>;
export type UpdateMarker = z.infer<typeof UpdateMarkerSchema>;
