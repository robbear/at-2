import type { ReactElement } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import type { Marker } from "@at-2/shared";
import { MarkerBody } from "./MarkerBody";

// Re-exported so existing test imports remain valid.
export { buildPreservedParams, extractMarkerId, makeAnchorComponent } from "./MarkerBody";

interface MarkerDetailViewProps {
  marker: Marker;
  searchString?: string;
  isOwner?: boolean;
}

export async function MarkerDetailView({
  marker,
  searchString = "",
  isOwner = false,
}: MarkerDetailViewProps): Promise<ReactElement> {
  const postedAt = new Date(marker.posttime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const datetime = new Date(marker.datetime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <nav className="mb-6">
        <Link
          href={`/${marker.id}${searchString ? `?${searchString}` : ""}`}
          className="inline-flex items-center gap-1 text-sm text-brand-blue hover:underline"
        >
          ← Return to map
        </Link>
      </nav>

      <article>
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 leading-tight mb-3">
            {marker.title}
          </h1>
          {isOwner && (
            <Link
              href={`/${marker.id}/edit${searchString ? `?${searchString}` : ""}`}
              className="inline-flex items-center gap-1.5 text-sm text-brand-blue hover:underline mb-3"
            >
              <Pencil size={14} />
              Edit
            </Link>
          )}
          <p className="text-sm text-slate-500">
            by{" "}
            <span className="font-medium text-slate-700">{marker.userId}</span>
            {" · "}
            {datetime !== postedAt
              ? `${datetime} · posted ${postedAt}`
              : postedAt}
          </p>
        </header>

        <MarkerBody marker={marker} searchString={searchString} />
      </article>
    </div>
  );
}
