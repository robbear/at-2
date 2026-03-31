"use client";

import { useCallback, startTransition, useEffect, useState } from "react";
import type { ReactNode, ReactElement } from "react";
import { useSearchParams, useRouter, useParams, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { selectProvider } from "@/lib/map/provider-select";
import { cn } from "@/lib/utils";
import type { MapProps, MarkerDot } from "./types";

const MapboxMap = dynamic<MapProps>(
  () =>
    import("@/components/maps/MapboxMap").then((m) => ({
      default: m.MapboxMap,
    })),
  { ssr: false },
);

const GoogleMap = dynamic<MapProps>(
  () =>
    import("@/components/maps/GoogleMap").then((m) => ({
      default: m.GoogleMap,
    })),
  { ssr: false },
);

const DEFAULT_LAT = 33.8337;
const DEFAULT_LNG = -60.8509;
const DEFAULT_ZOOM = 2;

interface MapShellProps {
  initialMarkers: MarkerDot[];
  providerOverride?: string;
  defaultLat?: number;
  defaultLng?: number;
  defaultZoom?: number;
  children?: ReactNode;
}

export function MapShell({
  initialMarkers,
  providerOverride,
  defaultLat = DEFAULT_LAT,
  defaultLng = DEFAULT_LNG,
  defaultZoom = DEFAULT_ZOOM,
  children,
}: MapShellProps): ReactElement {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();

  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  const zoomParam = searchParams.get("zoom");
  const mpParam = searchParams.get("mp");

  const [mapCenter, setMapCenter] = useState(() => ({
    lat: latParam !== null ? parseFloat(latParam) : defaultLat,
    lng: lngParam !== null ? parseFloat(lngParam) : defaultLng,
  }));
  const [mapZoom, setMapZoom] = useState(() =>
    zoomParam !== null ? parseFloat(zoomParam) : defaultZoom,
  );

  const provider = selectProvider(providerOverride, mpParam);

  // Determine overlay state from route
  const userId =
    typeof params["userId"] === "string" ? params["userId"] : undefined;
  const timestamp =
    typeof params["timestamp"] === "string" ? params["timestamp"] : undefined;
  const hasMarker = Boolean(userId && timestamp);
  const isDetail = pathname?.endsWith("/detail") ?? false;
  const hasPreview = hasMarker && !isDetail;

  // Auto-center on selected marker
  useEffect(() => {
    if (!userId || !timestamp) return;
    const markerId = `${userId}/${timestamp}`;
    const marker = initialMarkers.find((m) => m.id === markerId);
    if (marker) {
      setMapCenter({ lat: marker.lat, lng: marker.lng });
    }
  }, [userId, timestamp, initialMarkers]);

  const handleMove = useCallback(
    (center: { lat: number; lng: number }, z: number) => {
      setMapCenter(center);
      setMapZoom(z);
      startTransition(() => {
        const p = new URLSearchParams(searchParams.toString());
        p.set("lat", center.lat.toFixed(6));
        p.set("lng", center.lng.toFixed(6));
        p.set("zoom", z.toFixed(2));
        router.replace(`?${p.toString()}`);
      });
    },
    [router, searchParams],
  );

  const handleMarkerClick = useCallback(
    (markerId: string) => {
      const p = new URLSearchParams(searchParams.toString());
      router.push(`/${markerId}?${p.toString()}`);
    },
    [router, searchParams],
  );

  const mapProps: MapProps = {
    center: mapCenter,
    zoom: mapZoom,
    markers: initialMarkers,
    onMove: handleMove,
    onMarkerClick: handleMarkerClick,
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Persistent map */}
      <div
        className={cn(
          "absolute transition-all duration-300",
          !hasPreview && !isDetail && "inset-0",
          hasPreview &&
            "top-0 left-0 right-0 bottom-[45%] lg:bottom-0 lg:right-[40%]",
          isDetail && "inset-0 invisible",
        )}
      >
        {provider === "mapbox" ? (
          <MapboxMap {...mapProps} />
        ) : (
          <GoogleMap {...mapProps} />
        )}
      </div>

      {/* Preview panel — slides in from bottom (mobile) or right (desktop) */}
      <div
        className={cn(
          "absolute bg-surface overflow-auto shadow-lg",
          "transition-transform duration-300",
          // Portrait (mobile): bottom panel
          "left-0 right-0 bottom-0 h-[45%]",
          hasPreview ? "translate-y-0" : "translate-y-full",
          // Landscape (desktop): right panel
          "lg:top-0 lg:left-auto lg:bottom-0 lg:h-full lg:w-[40%] lg:border-l lg:border-slate-200",
          hasPreview ? "lg:translate-x-0" : "lg:translate-x-full",
          // Fade
          hasPreview ? "opacity-100" : "opacity-0 pointer-events-none",
          !isDetail && hasPreview ? "" : "lg:hidden",
        )}
      >
        {hasPreview && children}
      </div>

      {/* Detail overlay — full screen over map */}
      <div
        className={cn(
          "absolute inset-0 bg-surface overflow-auto z-10",
          "transition-opacity duration-300",
          isDetail ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        {isDetail && children}
      </div>
    </div>
  );
}
