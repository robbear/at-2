export interface MarkerDot {
  id: string;
  lat: number;
  lng: number;
  color?: string;   // custom fill (rgbFill); defaults to brand blue in BaseMarker
  outline?: string; // custom outline (rgbOutline); defaults to white in BaseMarker
}

/** Snippet-level data used by the footer marker list. */
export interface MarkerListItem {
  id: string;
  title: string;
  snippetImage?: string;
  snippetText?: string;
  userId: string;
  posttime: string;
}

export interface MapProps {
  center: { lat: number; lng: number };
  zoom: number;
  markers: MarkerDot[];
  satellite?: boolean;
  onMove?: (center: { lat: number; lng: number }, zoom: number) => void;
  onMarkerClick?: (markerId: string) => void;
  selectedMarkerId?: string;
  selectedMarkerCoords?: { lat: number; lng: number };
}
