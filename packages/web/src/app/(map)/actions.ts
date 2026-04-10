"use server";

import type { Marker } from "@at-2/shared";
import type { MarkerDot } from "@/components/maps/types";
import { getApiUrl } from "@/lib/api-url";

// QuerySpec param keys — used to forward the relevant subset of URL params
// to the API. Viewport params (lat/lng/zoom/mp) are intentionally excluded.
const QUERYSPEC_KEYS = [
  "userIds",
  "tags",
  "allTags",
  "markerIds",
  "near.lat",
  "near.lng",
  "near.distance",
  "dateRange.start",
  "dateRange.end",
  "dateRange.usePosttime",
] as const;

export async function fetchMarkersAction(searchString: string): Promise<MarkerDot[]> {
  const incoming = new URLSearchParams(searchString);
  const url = new URL(`${getApiUrl()}/api/v1/markers`);

  for (const key of QUERYSPEC_KEYS) {
    const values = incoming.getAll(key);
    for (const v of values) {
      url.searchParams.append(key, v);
    }
  }

  // Fall back to env-var defaults when no QuerySpec is active
  if (!url.searchParams.toString()) {
    const defaultUserIds = process.env["DEFAULT_QUERY_USERIDS"];
    const defaultTags = process.env["DEFAULT_QUERY_TAGS"];
    if (defaultUserIds) {
      for (const uid of defaultUserIds.split(",").map((s) => s.trim())) {
        if (uid) url.searchParams.append("userIds", uid);
      }
    }
    if (defaultTags) {
      for (const tag of defaultTags.split(",").map((s) => s.trim())) {
        if (tag) url.searchParams.append("tags", tag);
      }
    }
  }

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return [];
    const markers = (await res.json()) as Marker[];
    return markers.map((m) => {
      const rgbFill = m.markerColors?.rgbFill;
      const rgbOutline = m.markerColors?.rgbOutline;
      return {
        id: m.id,
        lat: m.location.coordinates[1],
        lng: m.location.coordinates[0],
        ...(rgbFill && { color: rgbFill.startsWith("#") ? rgbFill : `#${rgbFill}` }),
        ...(rgbOutline && { outline: rgbOutline.startsWith("#") ? rgbOutline : `#${rgbOutline}` }),
      };
    });
  } catch {
    return [];
  }
}
