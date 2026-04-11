import { Suspense } from "react";
import type { ReactNode } from "react";
import type { Marker } from "@at-2/shared";
import { MapLayoutClient } from "@/components/layout/MapLayoutClient";
import type { MarkerDot } from "@/components/maps/types";
import { getApiUrl } from "@/lib/api-url";

async function fetchMarkers(): Promise<MarkerDot[]> {
  const url = new URL(`${getApiUrl()}/api/v1/markers`);

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

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 60 } });
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

export default async function MapLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const markers = await fetchMarkers();

  const defaultLat = parseFloat(process.env["DEFAULT_LAT"] ?? "33.8337");
  const defaultLng = parseFloat(process.env["DEFAULT_LNG"] ?? "-60.8509");
  const defaultZoom = parseFloat(process.env["DEFAULT_ZOOM"] ?? "2");

  return (
    <Suspense
      fallback={<div className="w-full h-dvh bg-slate-100 animate-pulse" />}
    >
      <MapLayoutClient
        initialMarkers={markers}
        providerOverride={process.env["MAP_PROVIDER_OVERRIDE"]}
        defaultLat={defaultLat}
        defaultLng={defaultLng}
        defaultZoom={defaultZoom}
      >
        {children}
      </MapLayoutClient>
    </Suspense>
  );
}
