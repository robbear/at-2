import { Suspense } from "react";
import type { ReactElement } from "react";
import type { Marker } from "@at-2/shared";
import { MapView } from "./map-view";
import type { MarkerDot } from "@/components/maps/types";

async function fetchMarkers(): Promise<Marker[]> {
  const apiUrl = process.env["API_URL"] ?? "http://localhost:3001";
  const url = new URL(`${apiUrl}/api/v1/markers`);

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
    return (await res.json()) as Marker[];
  } catch {
    return [];
  }
}

export default async function HomePage(): Promise<ReactElement> {
  const markers = await fetchMarkers();

  const dots: MarkerDot[] = markers.map((m) => ({
    id: m.id,
    lat: m.location.coordinates[1],
    lng: m.location.coordinates[0],
    ...(m.markerColors !== undefined && { color: m.markerColors.fill }),
  }));

  const defaultLat = parseFloat(
    process.env["DEFAULT_LAT"] ?? String(33.8337),
  );
  const defaultLng = parseFloat(
    process.env["DEFAULT_LNG"] ?? String(-60.8509),
  );
  const defaultZoom = parseFloat(process.env["DEFAULT_ZOOM"] ?? String(2));

  return (
    <Suspense
      fallback={<div className="w-full h-screen bg-slate-100 animate-pulse" />}
    >
      <MapView
        markers={dots}
        providerOverride={process.env["MAP_PROVIDER_OVERRIDE"]}
        defaultLat={defaultLat}
        defaultLng={defaultLng}
        defaultZoom={defaultZoom}
      />
    </Suspense>
  );
}
