"use client";

import { useRef } from "react";
import type { ReactElement } from "react";
import type { MarkerListItem } from "@/components/maps/types";
import { resolveImageUrl } from "@/lib/r2-url";

// Horizontal distance (px) required to commit a swipe-right dismiss.
// Kept as a fixed value so it feels consistent regardless of item width —
// ~80px is comfortable on a phone without requiring a full arm extension.
const SWIPE_DISMISS_PX = 80;

interface MarkerListPanelProps {
  markers: MarkerListItem[];
  onSelect: (markerId: string) => void;
  onDismiss: () => void;
}

// Drag state stored in a ref so pointer-move updates bypass React re-renders.
interface DragState {
  startX: number;
  startY: number;
  axisLocked: boolean;  // true once we've committed to horizontal or vertical
  horizontal: boolean;  // true = horizontal swipe captured; false = let scroll win
}

function ListItem({
  marker,
  onSelect,
  onDismiss,
}: {
  marker: MarkerListItem;
  onSelect: (id: string) => void;
  onDismiss: () => void;
}): ReactElement {
  const itemRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<DragState | null>(null);
  // Suppress the click that follows a completed horizontal swipe on desktop.
  const suppressNextClickRef = useRef(false);

  const imageUrl = resolveImageUrl(marker.snippetImage);
  const postedAt = new Date(marker.posttime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  function snapBack(): void {
    const el = itemRef.current;
    if (!el) return;
    el.style.transition = "transform 0.2s ease, opacity 0.2s ease";
    el.style.transform = "translateX(0)";
    el.style.opacity = "1";
    // Remove the inline transition once animation finishes so hover/etc work normally.
    const cleanup = (): void => {
      el.style.transition = "";
      el.removeEventListener("transitionend", cleanup);
    };
    el.addEventListener("transitionend", cleanup);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>): void {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      axisLocked: false,
      horizontal: false,
    };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>): void {
    const drag = dragRef.current;
    if (!drag) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (!drag.axisLocked) {
      // Wait for enough movement before committing to an axis.
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;

      drag.axisLocked = true;

      if (Math.abs(dy) >= Math.abs(dx)) {
        // Vertical dominant — surrender to the scroll container.
        drag.horizontal = false;
        dragRef.current = null;
        return;
      }

      // Horizontal dominant — capture the pointer so scroll doesn't steal it.
      drag.horizontal = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    if (!drag.horizontal) return;

    // Prevent iOS Safari's back-navigation gesture from competing once we've
    // committed to a horizontal swipe.
    e.preventDefault();

    // Only track rightward movement (negative dx is ignored / clamped to 0).
    const clamped = Math.max(0, dx);
    const el = itemRef.current;
    if (!el) return;

    el.style.transition = "none";
    el.style.transform = `translateX(${clamped}px)`;
    // Fade toward half-opacity as it approaches the dismiss threshold.
    el.style.opacity = String(Math.max(0.4, 1 - clamped / SWIPE_DISMISS_PX));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>): void {
    const drag = dragRef.current;
    dragRef.current = null;

    if (!drag?.horizontal) return;

    const dx = e.clientX - drag.startX;
    const el = itemRef.current;
    if (dx >= SWIPE_DISMISS_PX) {
      // Past the threshold — dismiss the list.
      suppressNextClickRef.current = true;
      onDismiss();
    } else {
      snapBack();
    }
  }

  function handlePointerCancel(): void {
    dragRef.current = null;
    snapBack();
  }

  function handleClick(): void {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    onSelect(marker.id);
  }

  return (
    <button
      ref={itemRef}
      type="button"
      // touch-action: pan-y lets the browser handle vertical scroll normally;
      // our pointer handlers intercept only after horizontal axis is confirmed.
      style={{ touchAction: "pan-y" }}
      className="w-full text-left flex flex-col lg:flex-row gap-3 p-4 hover:bg-surface-muted transition-colors border-b border-slate-100 last:border-b-0 will-change-transform"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={handleClick}
    >
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={marker.title}
          className="w-full aspect-video object-cover rounded lg:w-40 lg:shrink-0 lg:aspect-auto lg:h-24"
        />
      )}
      <div className="flex flex-col gap-1 min-w-0">
        <p className="font-semibold text-slate-900 leading-snug line-clamp-2">
          {marker.title}
        </p>
        {marker.snippetText && (
          <p className="text-sm text-slate-600 line-clamp-2">
            {marker.snippetText}
          </p>
        )}
        <p className="text-xs text-slate-400 mt-auto">
          <span className="font-medium text-slate-500">{marker.userId}</span>
          {" · "}
          {postedAt}
        </p>
      </div>
    </button>
  );
}

export function MarkerListPanel({
  markers,
  onSelect,
  onDismiss,
}: MarkerListPanelProps): ReactElement {
  if (markers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        No markers to display.
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {markers.map((m) => (
        <ListItem key={m.id} marker={m} onSelect={onSelect} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
