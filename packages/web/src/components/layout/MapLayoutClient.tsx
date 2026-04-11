"use client";

import { useState, useEffect, useTransition } from "react";
import type { ReactNode, ReactElement } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "./Header";
import { SearchPanel } from "@/components/search/SearchPanel";
import { MapShell } from "@/components/maps/MapShell";
import { isQuerySpecActive } from "@/lib/queryspec-active";
import { fetchMarkersAction } from "@/app/(map)/actions";
import type { MarkerDot } from "@/components/maps/types";

// Keys whose changes should trigger a marker re-fetch
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
];

function querySpecString(searchParams: URLSearchParams): string {
  const p = new URLSearchParams();
  for (const key of QUERYSPEC_KEYS) {
    for (const v of searchParams.getAll(key)) {
      p.append(key, v);
    }
  }
  return p.toString();
}

interface MapLayoutClientProps {
  initialMarkers: MarkerDot[];
  providerOverride?: string;
  defaultLat?: number;
  defaultLng?: number;
  defaultZoom?: number;
  children: ReactNode;
}

export function MapLayoutClient({
  initialMarkers,
  providerOverride,
  defaultLat,
  defaultLng,
  defaultZoom,
  children,
}: MapLayoutClientProps): ReactElement {
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const [markers, setMarkers] = useState(initialMarkers);
  const [, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const searchActive = isQuerySpecActive(searchParams);

  // Re-fetch markers whenever the QuerySpec portion of the URL changes.
  // The dependency is the serialized QuerySpec string — viewport params
  // (lat/lng/zoom) don't trigger a re-fetch.
  const qsKey = querySpecString(searchParams);
  useEffect(() => {
    startTransition(() => {
      fetchMarkersAction(searchParams.toString()).then(setMarkers);
    });
    // qsKey is the actual dependency; searchParams object identity changes
    // on every render so we use the derived string instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qsKey]);

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <Header
        onSearchToggle={() => setSearchPanelOpen((o) => !o)}
        searchActive={searchActive}
      />
      <SearchPanel
        open={searchPanelOpen}
        onClose={() => setSearchPanelOpen(false)}
      />
      <div className="flex-1 relative min-h-0">
        <MapShell
          initialMarkers={markers}
          providerOverride={providerOverride}
          defaultLat={defaultLat}
          defaultLng={defaultLng}
          defaultZoom={defaultZoom}
        >
          {children}
        </MapShell>
      </div>
    </div>
  );
}
