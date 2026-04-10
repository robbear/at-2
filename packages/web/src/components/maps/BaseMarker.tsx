import type { ReactElement } from "react";

const PIN_W = 24;
const PIN_H = 36;
const PIN_PATH =
  "M12 0 C5.373 0 0 5.373 0 12 C0 20 12 36 12 36 C12 36 24 20 24 12 C24 5.373 18.627 0 12 0 Z";

const BRAND_BLUE = "#0094dd";
const BRAND_GREEN = "#93c572";
const DEFAULT_OUTLINE = "#ffffff";

interface BaseMarkerProps {
  color?: string;   // custom fill; defaults to brand blue. Ignored when selected.
  outline?: string; // custom outline stroke; defaults to white. Ignored when selected.
  size?: number;    // base size multiplier, default 1 (24×36px)
  selected?: boolean; // if true, render 25% larger with green fill and white outline
}

export function BaseMarker({
  color = BRAND_BLUE,
  outline = DEFAULT_OUTLINE,
  size = 1,
  selected = false,
}: BaseMarkerProps): ReactElement {
  const scale = selected ? size * 1.25 : size;
  const w = PIN_W * scale;
  const h = PIN_H * scale;

  // Selection state always uses brand green fill + white outline regardless of
  // custom color props.
  const fillColor = selected ? BRAND_GREEN : color;
  const strokeColor = selected ? DEFAULT_OUTLINE : outline;

  return (
    // Padding extends the tap/click target to at least 44×44px
    <div style={{ padding: 4, display: "inline-flex", cursor: "pointer" }}>
      <svg width={w} height={h} viewBox="0 0 24 36" style={{ display: "block" }}>
        <path
          d={PIN_PATH}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="2"
        />
        <circle cx="12" cy="12" r="4" fill="white" />
      </svg>
    </div>
  );
}
