"use client";

import type { ReactElement } from "react";
import type { MarkerListItem } from "@/components/maps/types";
import { resolveImageUrl } from "@/lib/r2-url";

interface MarkerListPanelProps {
  markers: MarkerListItem[];
  onSelect: (markerId: string) => void;
}

function ListItem({
  marker,
  onSelect,
}: {
  marker: MarkerListItem;
  onSelect: (id: string) => void;
}): ReactElement {
  const imageUrl = resolveImageUrl(marker.snippetImage);
  const postedAt = new Date(marker.posttime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <button
      type="button"
      className="w-full text-left flex flex-col lg:flex-row gap-3 p-4 hover:bg-surface-muted transition-colors border-b border-slate-100 last:border-b-0"
      onClick={() => onSelect(marker.id)}
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
        <ListItem key={m.id} marker={m} onSelect={onSelect} />
      ))}
    </div>
  );
}
