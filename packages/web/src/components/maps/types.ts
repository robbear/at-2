export interface MarkerDot {
  id: string;
  lat: number;
  lng: number;
  color?: string;
}

export interface MapProps {
  center: { lat: number; lng: number };
  zoom: number;
  markers: MarkerDot[];
  onMove?: (center: { lat: number; lng: number }, zoom: number) => void;
}
