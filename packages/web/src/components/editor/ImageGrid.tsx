"use client";

import type { ReactElement } from "react";
import { Star, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LocalImage {
  /** Sequential name: "1.jpg", "2.jpg", etc. — assigned after all images are ordered */
  name: string;
  /** R2 path after upload, or null if not yet uploaded */
  r2Path: string | null;
  /** Local object URL for preview before upload */
  previewUrl: string;
  /** Resized File blob ready for upload */
  file: File;
}

interface ImageGridProps {
  images: LocalImage[];
  coverName: string; // which name is the cover ("1.jpg" etc.)
  onCoverChange: (name: string) => void;
  onRemove: (index: number) => void;
}

export function ImageGrid({
  images,
  coverName,
  onCoverChange,
  onRemove,
}: ImageGridProps): ReactElement | null {
  if (images.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {images.map((img, i) => {
        const isCover = img.name === coverName;
        return (
          <div
            key={img.name}
            className={cn(
              "relative rounded overflow-hidden border-2 aspect-square",
              isCover ? "border-brand-blue" : "border-slate-200",
            )}
          >
            {/* Thumbnail */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.previewUrl}
              alt={img.name}
              className="w-full h-full object-cover"
            />

            {/* Name label */}
            <span className="absolute bottom-0 left-0 right-0 text-center text-xs text-white bg-black/50 py-0.5">
              {img.name}
            </span>

            {/* Star (cover) button */}
            <button
              type="button"
              aria-label={isCover ? "Cover image" : "Set as cover"}
              onClick={() => onCoverChange(img.name)}
              className={cn(
                "absolute top-1 left-1 p-0.5 rounded-full transition-colors",
                isCover
                  ? "text-yellow-400"
                  : "text-white/80 hover:text-yellow-400",
              )}
            >
              <Star
                size={16}
                fill={isCover ? "currentColor" : "none"}
                strokeWidth={2}
              />
            </button>

            {/* Remove button */}
            <button
              type="button"
              aria-label={`Remove ${img.name}`}
              onClick={() => onRemove(i)}
              className="absolute top-1 right-1 p-0.5 rounded-full bg-black/50 text-white hover:bg-red-600 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
