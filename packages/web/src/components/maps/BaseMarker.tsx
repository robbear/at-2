import type { ReactElement } from "react";

interface BaseMarkerProps {
  color?: string; // default "#2563eb" (primary)
  size?: number; // default 10px diameter
}

export function BaseMarker({
  color = "#2563eb",
  size = 10,
}: BaseMarkerProps): ReactElement {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: color,
        border: "2px solid white",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }}
    />
  );
}
