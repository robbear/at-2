"use client";

import { useState } from "react";
import type { ReactNode, ReactElement } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "./Header";
import { SearchPanel } from "@/components/search/SearchPanel";
import { MapShell } from "@/components/maps/MapShell";
import { isQuerySpecActive } from "@/lib/queryspec-active";
import type { MarkerDot } from "@/components/maps/types";

interface MapLayoutClientProps {
  markers: MarkerDot[];
  providerOverride?: string;
  defaultLat?: number;
  defaultLng?: number;
  defaultZoom?: number;
  children: ReactNode;
}

export function MapLayoutClient({
  markers,
  providerOverride,
  defaultLat,
  defaultLng,
  defaultZoom,
  children,
}: MapLayoutClientProps): ReactElement {
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const searchParams = useSearchParams();
  const searchActive = isQuerySpecActive(searchParams);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
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
