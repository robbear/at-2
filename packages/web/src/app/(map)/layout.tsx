import { Suspense } from "react";
import type { ReactNode } from "react";
import type { Marker } from "@at-2/shared";
import { MapLayoutClient } from "@/components/layout/MapLayoutClient";
import type { MarkerDot, MarkerListItem } from "@/components/maps/types";
import { getApiUrl } from "@/lib/api-url";
import { auth } from "@/auth";

interface FetchMarkersResult {
  dots: MarkerDot[];
  listItems: MarkerListItem[];
}

async function fetchMarkers(): Promise<FetchMarkersResult> {
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
    if (!res.ok) return { dots: [], listItems: [] };
    const markers = (await res.json()) as Marker[];

    const dots: MarkerDot[] = markers.map((m) => {
      const rgbFill = m.markerColors?.rgbFill;
      const rgbOutline = m.markerColors?.rgbOutline;
      return {
        id: m.id,
        lat: m.location.coordinates[1],
        lng: m.location.coordinates[0],
        ...(rgbFill && {
          color: rgbFill.startsWith("#") ? rgbFill : `#${rgbFill}`,
        }),
        ...(rgbOutline && {
          outline: rgbOutline.startsWith("#") ? rgbOutline : `#${rgbOutline}`,
        }),
      };
    });

    const listItems: MarkerListItem[] = [...markers]
      .sort(
        (a, b) =>
          new Date(b.posttime).getTime() - new Date(a.posttime).getTime(),
      )
      .map((m) => ({
        id: m.id,
        title: m.title,
        snippetImage: m.snippetImage ?? undefined,
        snippetText: m.snippetText ?? undefined,
        userId: m.userId,
        posttime: new Date(m.posttime).toISOString(),
      }));

    return { dots, listItems };
  } catch {
    return { dots: [], listItems: [] };
  }
}

function canToggleMapProvider(userEmail: string | null | undefined): boolean {
  const override = process.env["MAP_PROVIDER_OVERRIDE"];
  if (override === "google" || override === "mapbox") return false;
  if (!userEmail) return false;
  const allowlist = process.env["MAP_PROVIDER_TOGGLE_ALLOWLIST"] ?? "";
  return allowlist
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .includes(userEmail.toLowerCase());
}

export default async function MapLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const [{ dots, listItems }, session] = await Promise.all([
    fetchMarkers(),
    auth(),
  ]);

  const defaultLat = parseFloat(process.env["DEFAULT_LAT"] ?? "33.8337");
  const defaultLng = parseFloat(process.env["DEFAULT_LNG"] ?? "-60.8509");
  const defaultZoom = parseFloat(process.env["DEFAULT_ZOOM"] ?? "2");

  return (
    <Suspense
      fallback={<div className="w-full h-dvh bg-slate-100 animate-pulse" />}
    >
      <MapLayoutClient
        initialMarkers={dots}
        initialListItems={listItems}
        providerOverride={process.env["MAP_PROVIDER_OVERRIDE"]}
        canToggleProvider={canToggleMapProvider(session?.user?.email)}
        defaultLat={defaultLat}
        defaultLng={defaultLng}
        defaultZoom={defaultZoom}
      >
        {children}
      </MapLayoutClient>
    </Suspense>
  );
}
