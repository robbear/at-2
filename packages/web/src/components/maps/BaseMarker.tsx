import type { ReactElement } from "react";

const PIN_W = 24;
const PIN_H = 36;
const PIN_PATH =
  "M12 0 C5.373 0 0 5.373 0 12 C0 20 12 36 12 36 C12 36 24 20 24 12 C24 5.373 18.627 0 12 0 Z";

interface BaseMarkerProps {
  color?: string; // hex fill color, defaults to "#0094dd" (brand.blue)
  size?: number; // base size multiplier, default 1 (24×36px)
  selected?: boolean; // if true, render 25% larger with a white outer ring
}

export function BaseMarker({
  color = "#0094dd",
  size = 1,
  selected = false,
}: BaseMarkerProps): ReactElement {
  const scale = selected ? size * 1.25 : size;
  const w = PIN_W * scale;
  const h = PIN_H * scale;

  return (
    // Padding extends the tap/click target to at least 44×44px
    <div style={{ padding: 4, display: "inline-flex", cursor: "pointer" }}>
      <svg width={w} height={h} viewBox="0 0 24 36" style={{ display: "block" }}>
        {selected && (
          <path d={PIN_PATH} fill="none" stroke="white" strokeWidth="3" />
        )}
        <path
          d={PIN_PATH}
          fill={color}
          stroke="rgba(0,0,0,0.2)"
          strokeWidth="1"
        />
        <circle cx="12" cy="12" r="4" fill="white" />
      </svg>
    </div>
  );
}
