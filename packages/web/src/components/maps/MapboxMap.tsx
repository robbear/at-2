"use client";

import { useRef, useCallback, useEffect } from "react";
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
  onMove,
  onMarkerClick,
  selectedMarkerId,
}: MapProps): ReactElement {
  const mapRef = useRef<MapRef>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Mapbox GL JS does not detect container resizes driven by CSS transitions.
  // A ResizeObserver on the wrapper fires during the transition and forces
  // the canvas to match its container at every frame.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
        mapStyle="mapbox://styles/mapbox/streets-v12"
        onMoveEnd={handleMoveEnd}
      >
        {markers.map((marker) => (
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
              selected={marker.id === selectedMarkerId}
            />
          </Marker>
        ))}
      </Map>
    </div>
  );
}
