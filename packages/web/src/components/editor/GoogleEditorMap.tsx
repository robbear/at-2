"use client";

import { useCallback, useState } from "react";
import type { ReactElement } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
} from "@vis.gl/react-google-maps";
import { BaseMarker } from "@/components/maps/BaseMarker";

interface GoogleEditorMapProps {
  lat: number | null;
  lng: number | null;
  color?: string;
  outline?: string;
  onLocationChange: (lat: number, lng: number) => void;
}

const DEFAULT_LAT = 33.8337;
const DEFAULT_LNG = -60.8509;
const DEFAULT_ZOOM = 2;

export function GoogleEditorMap({
  lat,
  lng,
  color = "#0094dd",
  outline = "#ffffff",
  onLocationChange,
}: GoogleEditorMapProps): ReactElement {
  const hasLocation = lat !== null && lng !== null;
  const [position, setPosition] = useState(
    hasLocation ? { lat: lat!, lng: lng! } : null,
  );

  const handleMapClick = useCallback(
    (evt: { detail?: { latLng?: { lat: number; lng: number } | null } }) => {
      const latLng = evt.detail?.latLng;
      if (!latLng) return;
      setPosition({ lat: latLng.lat, lng: latLng.lng });
      onLocationChange(latLng.lat, latLng.lng);
    },
    [onLocationChange],
  );

  const handleDragEnd = useCallback(
    (evt: { latLng?: { lat: () => number; lng: () => number } | null }) => {
      if (!evt.latLng) return;
      const newLat = evt.latLng.lat();
      const newLng = evt.latLng.lng();
      setPosition({ lat: newLat, lng: newLng });
      onLocationChange(newLat, newLng);
    },
    [onLocationChange],
  );

  return (
    <APIProvider apiKey={process.env["NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"] ?? ""}>
      <Map
        defaultCenter={{
          lat: lat ?? DEFAULT_LAT,
          lng: lng ?? DEFAULT_LNG,
        }}
        defaultZoom={hasLocation ? 10 : DEFAULT_ZOOM}
        mapId="editor-map"
        style={{ width: "100%", height: "100%" }}
        onClick={handleMapClick}
        gestureHandling="greedy"
      >
        {position && (
          <AdvancedMarker
            position={position}
            draggable
            onDragEnd={handleDragEnd}
          >
            <BaseMarker color={color} outline={outline} size={1.25} />
          </AdvancedMarker>
        )}
      </Map>
      {!position && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="bg-white/80 text-slate-600 text-sm px-3 py-1.5 rounded shadow">
            Click the map to set location
          </p>
        </div>
      )}
    </APIProvider>
  );
}
