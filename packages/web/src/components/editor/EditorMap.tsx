"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import type { ReactElement } from "react";
import dynamic from "next/dynamic";
import { selectProvider } from "@/lib/map/provider-select";
import { BaseMarker } from "@/components/maps/BaseMarker";

// Lazy-load map libs (require browser APIs)
const MapboxEditorMap = dynamic(
  () => import("./MapboxEditorMap").then((m) => ({ default: m.MapboxEditorMap })),
  { ssr: false },
);

const GoogleEditorMap = dynamic(
  () => import("./GoogleEditorMap").then((m) => ({ default: m.GoogleEditorMap })),
  { ssr: false },
);

export interface EditorMapProps {
  lat: number | null;
  lng: number | null;
  color?: string;
  outline?: string;
  onLocationChange: (lat: number, lng: number) => void;
  providerOverride?: string;
}

export function EditorMap({
  lat,
  lng,
  color = "#0094dd",
  outline = "#ffffff",
  onLocationChange,
  providerOverride,
}: EditorMapProps): ReactElement {
  const provider = selectProvider(providerOverride, null);

  if (provider === "mapbox") {
    return (
      <MapboxEditorMap
        lat={lat}
        lng={lng}
        color={color}
        outline={outline}
        onLocationChange={onLocationChange}
      />
    );
  }
  return (
    <GoogleEditorMap
      lat={lat}
      lng={lng}
      color={color}
      outline={outline}
      onLocationChange={onLocationChange}
    />
  );
}
