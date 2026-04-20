"use client";

import { useState, useEffect, useTransition } from "react";
import type { ReactNode, ReactElement } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "./Header";
import { SearchPanel } from "@/components/search/SearchPanel";
import { MapShell } from "@/components/maps/MapShell";
import { isQuerySpecActive } from "@/lib/queryspec-active";
import { fetchMarkersAction } from "@/app/(map)/actions";
import { selectProvider } from "@/lib/map/provider-select";
import { usePersistedViewState } from "@/hooks/usePersistedViewState";
import type { MarkerDot, MarkerListItem } from "@/components/maps/types";

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
  initialListItems: MarkerListItem[];
  providerOverride?: string;
  defaultProvider?: string;
  canToggleProvider?: boolean;
  defaultLat?: number;
  defaultLng?: number;
  defaultZoom?: number;
  children: ReactNode;
}

export function MapLayoutClient({
  initialMarkers,
  initialListItems,
  providerOverride,
  defaultProvider,
  canToggleProvider = false,
  defaultLat,
  defaultLng,
  defaultZoom,
  children,
}: MapLayoutClientProps): ReactElement {
  usePersistedViewState();

  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const [markers, setMarkers] = useState(initialMarkers);
  const [markerListItems, setMarkerListItems] = useState(initialListItems);
  const [, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const searchActive = isQuerySpecActive(searchParams);
  const activeProvider = selectProvider(providerOverride, searchParams.get("mp"), defaultProvider);

  // Re-fetch markers whenever the QuerySpec portion of the URL changes.
  const qsKey = querySpecString(searchParams);
  useEffect(() => {
    startTransition(() => {
      fetchMarkersAction(searchParams.toString()).then(({ dots, listItems }) => {
        setMarkers(dots);
        setMarkerListItems(listItems);
      });
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
        canToggleProvider={canToggleProvider}
        activeProvider={activeProvider}
      />
      <SearchPanel
        open={searchPanelOpen}
        onClose={() => setSearchPanelOpen(false)}
      />
      <div className="flex-1 relative min-h-0">
        <MapShell
          initialMarkers={markers}
          markerListItems={markerListItems}
          providerOverride={providerOverride}
          defaultProvider={defaultProvider}
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
