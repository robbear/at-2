"use client";

import { useEffect } from "react";
import type { ReactElement } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps";
import { BaseMarker } from "./BaseMarker";
import type { MapProps } from "./types";

interface IdleSyncProps {
  onMove?: (center: { lat: number; lng: number }, zoom: number) => void;
}

/** Attaches a Google Maps `idle` event listener via the useMap hook. */
function IdleSync({ onMove }: IdleSyncProps): null {
  const map = useMap();

  useEffect(() => {
    if (!map || !onMove) return;

    const handleIdle = (): void => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      if (center !== undefined && zoom !== undefined) {
        onMove({ lat: center.lat(), lng: center.lng() }, zoom);
      }
    };

    const listener = map.addListener("idle", handleIdle);
    return (): void => {
      listener.remove();
    };
  }, [map, onMove]);

  return null;
}

export function GoogleMap({
  center,
  zoom,
  markers,
  onMove,
}: MapProps): ReactElement {
  const apiKey = process.env["NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"] ?? "";

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={center}
        defaultZoom={zoom}
        style={{ width: "100%", height: "100%" }}
        gestureHandling="greedy"
        disableDefaultUI={true}
        mapId="atlasphere-main"
      >
        {markers.map((marker) => (
          <AdvancedMarker
            key={marker.id}
            position={{ lat: marker.lat, lng: marker.lng }}
          >
            <BaseMarker color={marker.color} />
          </AdvancedMarker>
        ))}
        <IdleSync onMove={onMove} />
      </Map>
    </APIProvider>
  );
}
