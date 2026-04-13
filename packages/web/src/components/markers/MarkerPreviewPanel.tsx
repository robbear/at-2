"use client";

import type { ReactElement, ReactNode } from "react";
import Link from "next/link";
import { Pencil, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Marker } from "@at-2/shared";

interface MarkerPreviewPanelProps {
  marker: Marker;
  children?: ReactNode;
}

export function MarkerPreviewPanel({
  marker,
  children,
}: MarkerPreviewPanelProps): ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const isOwner = session?.user?.userId === marker.userId;

  function handleClose(): void {
    const p = new URLSearchParams(searchParams.toString());
    router.push(`/?${p.toString()}`);
  }

  const postedAt = new Date(marker.posttime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-4 gap-2 bg-brand-blue">
        <div className="flex flex-col min-w-0 gap-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white leading-snug">
              {marker.title}
            </h2>
            {isOwner && (
              <Link
                href={`/${marker.id}/edit${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
                className="shrink-0 p-1 hover:bg-white/20 rounded-md transition-colors text-white"
                aria-label="Edit marker"
              >
                <Pencil size={16} />
              </Link>
            )}
          </div>
          <p className="text-xs text-white/70">
            by{" "}
            <span className="font-medium text-white/90">{marker.userId}</span>
            {" · "}
            {postedAt}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="shrink-0 p-1 hover:bg-white/20 rounded-md transition-colors text-white"
          aria-label="Close preview"
        >
          <X size={20} />
        </button>
      </div>

      {/* Scrollable body — server-rendered MDX passed as children */}
      <div className="flex-1 overflow-auto px-4 py-4">{children}</div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200">
        <Link
          href={`/${marker.id}/detail?${searchParams.toString()}`}
          className="block w-full text-center bg-brand-blue text-white py-2 px-4 rounded-md font-medium hover:bg-brand-blue/90 transition-colors"
        >
          Full view
        </Link>
      </div>
    </div>
  );
}
