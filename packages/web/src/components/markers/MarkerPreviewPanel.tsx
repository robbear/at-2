"use client";

import type { ReactElement } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Marker } from "@at-2/shared";
import { resolveImageUrl } from "@/lib/r2-url";

interface MarkerPreviewPanelProps {
  marker: Marker;
}

export function MarkerPreviewPanel({
  marker,
}: MarkerPreviewPanelProps): ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleClose(): void {
    const p = new URLSearchParams(searchParams.toString());
    router.push(`/?${p.toString()}`);
  }

  const imageUrl = resolveImageUrl(marker.snippetImage);

  const postedAt = new Date(marker.posttime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header row */}
      <div className="flex items-start justify-between p-4 gap-2 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 leading-snug">
          {marker.title}
        </h2>
        <button
          type="button"
          onClick={handleClose}
          className="shrink-0 p-1 hover:bg-slate-100 rounded-md transition-colors"
          aria-label="Close preview"
        >
          <X size={20} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto">
        {imageUrl && (
          <div className="relative w-full aspect-video">
            <Image
              src={imageUrl}
              alt={marker.title}
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        )}

        <div className="p-4 space-y-3">
          {marker.snippetText && (
            <p className="text-sm text-slate-700 leading-relaxed">
              {marker.snippetText}
            </p>
          )}

          <p className="text-xs text-slate-500">
            by{" "}
            <span className="font-medium text-slate-700">{marker.userId}</span>
            {" · "}
            {postedAt}
          </p>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="p-4 border-t border-slate-200">
        <Link
          href={`/${marker.id}/detail`}
          className="block w-full text-center bg-brand-blue text-white py-2 px-4 rounded-md font-medium hover:bg-brand-blue/90 transition-colors"
        >
          Full view
        </Link>
      </div>
    </div>
  );
}
