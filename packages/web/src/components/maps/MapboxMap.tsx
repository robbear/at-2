"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import type { ReactElement } from "react";
import Map, { Marker, type MapRef } from "react-map-gl/mapbox";
import type { ViewStateChangeEvent } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { BaseMarker } from "./BaseMarker";
import type { MapProps } from "./types";

export function MapboxMap({
  center,
  zoom,
  markers,
  satellite = false,
  onMove,
  onMarkerClick,
  selectedMarkerId,
  selectedMarkerCoords,
}: MapProps): ReactElement {
  const mapRef = useRef<MapRef>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Gate marker rendering on the map being fully initialized. The Marker
  // component from @vis.gl/react-mapbox calls marker.addTo(map) in a
  // mount-only useEffect. If the Map component remounts (e.g. after a
  // Suspense boundary triggers during navigation), the old mapbox-gl Map
  // instance is destroyed before the new one is ready, causing an
  // "appendChild on undefined" error. Resetting this flag on mount and
  // waiting for onLoad ensures Markers only render against a live map.
  const [mapReady, setMapReady] = useState(false);

  // Mapbox GL JS does not detect container resizes driven by CSS transitions.
  // A ResizeObserver on the wrapper fires during the transition and forces
  // the canvas to match its container at every frame.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      // Defer resize() out of the ResizeObserver callback so it never fires
      // synchronously during React's layout phase. Calling resize() inline can
      // trigger moveend → handleMove → setState while React is still committing,
      // which causes "Maximum update depth exceeded".
      requestAnimationFrame(() => mapRef.current?.resize());
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!selectedMarkerCoords || !mapRef.current) return;
    const map = mapRef.current.getMap();
    const bounds = map.getBounds();
    if (
      bounds &&
      !bounds.contains([selectedMarkerCoords.lng, selectedMarkerCoords.lat])
    ) {
      map.flyTo({ center: [selectedMarkerCoords.lng, selectedMarkerCoords.lat] });
    }
  }, [selectedMarkerCoords]);

  const handleMoveEnd = useCallback(
    (evt: ViewStateChangeEvent) => {
      const { latitude, longitude, zoom: z } = evt.viewState;
      onMove?.({ lat: latitude, lng: longitude }, z);
    },
    [onMove],
  );

  return (
    <div ref={wrapperRef} style={{ width: "100%", height: "100%" }}>
      <Map
        ref={mapRef}
        mapboxAccessToken={process.env["NEXT_PUBLIC_MAPBOX_TOKEN"]}
        initialViewState={{
          latitude: center.lat,
          longitude: center.lng,
          zoom,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={satellite ? "mapbox://styles/mapbox/satellite-streets-v12" : "mapbox://styles/mapbox/streets-v12"}
        onLoad={() => setMapReady(true)}
        onMoveEnd={handleMoveEnd}
      >
        {mapReady && markers.map((marker) => (
          <Marker
            key={marker.id}
            latitude={marker.lat}
            longitude={marker.lng}
            anchor="bottom"
            onClick={() => onMarkerClick?.(marker.id)}
            style={{ cursor: onMarkerClick ? "pointer" : "default" }}
          >
            <BaseMarker
              color={marker.color}
              outline={marker.outline}
              selected={marker.id === selectedMarkerId}
            />
          </Marker>
        ))}
      </Map>
    </div>
  );
}
