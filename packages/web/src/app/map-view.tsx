"use client";

import { useCallback, startTransition } from "react";
import type { ReactElement } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { selectProvider } from "@/lib/map/provider-select";
import type { MapProps, MarkerDot } from "@/components/maps/types";

// Loaded with ssr:false — mapbox-gl and Google Maps require a browser environment.
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

interface MapViewProps {
  markers: MarkerDot[];
  providerOverride: string | undefined;
  defaultLat?: number;
  defaultLng?: number;
  defaultZoom?: number;
}

export function MapView({
  markers,
  providerOverride,
  defaultLat = DEFAULT_LAT,
  defaultLng = DEFAULT_LNG,
  defaultZoom = DEFAULT_ZOOM,
}: MapViewProps): ReactElement {
  const searchParams = useSearchParams();
  const router = useRouter();

  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  const zoomParam = searchParams.get("zoom");
  const mpParam = searchParams.get("mp");

  const lat = latParam !== null ? parseFloat(latParam) : defaultLat;
  const lng = lngParam !== null ? parseFloat(lngParam) : defaultLng;
  const zoom = zoomParam !== null ? parseFloat(zoomParam) : defaultZoom;

  const provider = selectProvider(providerOverride, mpParam);

  const handleMove = useCallback(
    (center: { lat: number; lng: number }, z: number) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("lat", center.lat.toFixed(6));
        params.set("lng", center.lng.toFixed(6));
        params.set("zoom", z.toFixed(2));
        router.replace(`?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  const mapProps: MapProps = {
    center: { lat, lng },
    zoom,
    markers,
    onMove: handleMove,
  };

  return (
    <div className="w-full h-screen">
      {provider === "mapbox" ? (
        <MapboxMap {...mapProps} />
      ) : (
        <GoogleMap {...mapProps} />
      )}
    </div>
  );
}
