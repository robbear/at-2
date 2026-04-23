import type { MetadataRoute } from "next";
import type { Marker } from "@at-2/shared";
import { getApiUrl } from "@/lib/api-url";
import { getBaseUrl } from "@/lib/base-url";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl();

  const url = new URL(`${getApiUrl()}/api/v1/markers`);

  // Apply the same default scoping as the map layout so only publicly
  // surfaced markers appear in the sitemap.
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

  let markers: Marker[] = [];
  try {
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (res.ok) {
      markers = (await res.json()) as Marker[];
    }
  } catch {
    // Sitemap degrades gracefully to home-only if the API is unreachable.
  }

  const home: MetadataRoute.Sitemap[number] = {
    url: base,
    changeFrequency: "daily",
    priority: 1,
  };

  const markerEntries: MetadataRoute.Sitemap = markers.flatMap((m) => [
    {
      url: `${base}/${m.id}`,
      lastModified: new Date(m.posttime),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/${m.id}/details`,
      lastModified: new Date(m.posttime),
      changeFrequency: "monthly",
      priority: 0.9,
    },
  ]);

  return [home, ...markerEntries];
}
