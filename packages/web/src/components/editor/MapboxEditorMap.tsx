"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import type { ReactElement } from "react";
import Map, { Marker, type MapRef } from "react-map-gl/mapbox";
import type { MarkerDragEvent } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { BaseMarker } from "@/components/maps/BaseMarker";

interface MapboxEditorMapProps {
  lat: number | null;
  lng: number | null;
  color?: string;
  outline?: string;
  onLocationChange: (lat: number, lng: number) => void;
}

const DEFAULT_LAT = 33.8337;
const DEFAULT_LNG = -60.8509;
const DEFAULT_ZOOM = 2;

export function MapboxEditorMap({
  lat,
  lng,
  color = "#0094dd",
  outline = "#ffffff",
  onLocationChange,
}: MapboxEditorMapProps): ReactElement {
  const mapRef = useRef<MapRef>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hasLocation = lat !== null && lng !== null;

  // Sync map center when location changes externally
  useEffect(() => {
    if (lat !== null && lng !== null && mapRef.current) {
      mapRef.current.flyTo({ center: [lng, lat], zoom: 10 });
    }
  }, [lat, lng]);

  // Keep map canvas sized to container during CSS transitions
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleDragEnd = useCallback(
    (evt: MarkerDragEvent) => {
      onLocationChange(evt.lngLat.lat, evt.lngLat.lng);
    },
    [onLocationChange],
  );

  const handleMapClick = useCallback(
    (evt: { lngLat: { lat: number; lng: number } }) => {
      onLocationChange(evt.lngLat.lat, evt.lngLat.lng);
    },
    [onLocationChange],
  );

  return (
    <div ref={wrapperRef} style={{ width: "100%", height: "100%" }}>
      <Map
        ref={mapRef}
        mapboxAccessToken={process.env["NEXT_PUBLIC_MAPBOX_TOKEN"]}
        initialViewState={{
          latitude: lat ?? DEFAULT_LAT,
          longitude: lng ?? DEFAULT_LNG,
          zoom: hasLocation ? 10 : DEFAULT_ZOOM,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        onClick={handleMapClick}
        cursor="crosshair"
      >
        {hasLocation && (
          <Marker
            latitude={lat!}
            longitude={lng!}
            anchor="bottom"
            draggable
            onDragEnd={handleDragEnd}
          >
            <BaseMarker color={color} outline={outline} size={1.25} />
          </Marker>
        )}
      </Map>
      {!hasLocation && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="bg-white/80 text-slate-600 text-sm px-3 py-1.5 rounded shadow">
            Click the map to set location
          </p>
        </div>
      )}
    </div>
  );
}
