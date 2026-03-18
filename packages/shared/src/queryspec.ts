import { z } from "zod";

export const NearSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  distance: z.number().default(40000), // meters, default 40km
});

export const DateRangeSchema = z.object({
  start: z.string(), // ISO date string
  end: z.string(), // ISO date string
  usePosttime: z.boolean().default(false),
});

export const QuerySpecSchema = z.object({
  userIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  allTags: z.boolean().default(false),
  markerIds: z.array(z.string()).optional(),
  near: NearSchema.optional(),
  dateRange: DateRangeSchema.optional(),
});

export type Near = z.infer<typeof NearSchema>;
export type DateRange = z.infer<typeof DateRangeSchema>;
export type QuerySpec = z.infer<typeof QuerySpecSchema>;
