"use client";

import { useEffect, useCallback } from "react";
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

interface MarkerFocusProps {
  selectedMarkerCoords?: { lat: number; lng: number };
}

/** Pans to the selected marker coords if they fall outside the current viewport. */
function MarkerFocus({ selectedMarkerCoords }: MarkerFocusProps): null {
  const map = useMap();

  useEffect(() => {
    if (!map || !selectedMarkerCoords) return;
    const bounds = map.getBounds();
    if (
      bounds &&
      !bounds.contains({ lat: selectedMarkerCoords.lat, lng: selectedMarkerCoords.lng })
    ) {
      map.panTo({ lat: selectedMarkerCoords.lat, lng: selectedMarkerCoords.lng });
    }
  }, [map, selectedMarkerCoords]);

  return null;
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
  satellite = false,
  onMove,
  onMarkerClick,
  selectedMarkerId,
  selectedMarkerCoords,
}: MapProps): ReactElement {
  const apiKey = process.env["NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"] ?? "";

  const handleMarkerClick = useCallback(
    (markerId: string) => () => {
      onMarkerClick?.(markerId);
    },
    [onMarkerClick],
  );

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={center}
        defaultZoom={zoom}
        style={{ width: "100%", height: "100%" }}
        gestureHandling="greedy"
        disableDefaultUI={true}
        mapId="atlasphere-main"
        mapTypeId={satellite ? "hybrid" : "roadmap"}
      >
        {markers.map((marker) => (
          <AdvancedMarker
            key={marker.id}
            position={{ lat: marker.lat, lng: marker.lng }}
            onClick={handleMarkerClick(marker.id)}
            style={{ cursor: onMarkerClick ? "pointer" : "default" }}
          >
            <BaseMarker
              color={marker.color}
              outline={marker.outline}
              selected={marker.id === selectedMarkerId}
            />
          </AdvancedMarker>
        ))}
        <IdleSync onMove={onMove} />
        <MarkerFocus selectedMarkerCoords={selectedMarkerCoords} />
      </Map>
    </APIProvider>
  );
}
