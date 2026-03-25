"use client";

import { useRef, useCallback } from "react";
import type { ReactElement } from "react";
import Map, { Marker, type MapRef } from "react-map-gl/mapbox";
import type { ViewStateChangeEvent } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { BaseMarker } from "./BaseMarker.js";
import type { MapProps } from "./types.js";

export function MapboxMap({
  center,
  zoom,
  markers,
  onMove,
}: MapProps): ReactElement {
  const mapRef = useRef<MapRef>(null);

  const handleMoveEnd = useCallback(
    (evt: ViewStateChangeEvent) => {
      const { latitude, longitude, zoom: z } = evt.viewState;
      onMove?.({ lat: latitude, lng: longitude }, z);
    },
    [onMove],
  );

  return (
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
        <Marker key={marker.id} latitude={marker.lat} longitude={marker.lng}>
          <BaseMarker color={marker.color} />
        </Marker>
      ))}
    </Map>
  );
}
