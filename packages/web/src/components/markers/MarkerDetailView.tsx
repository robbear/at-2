import type { ReactElement } from "react";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { Marker } from "@at-2/shared";

interface MarkerDetailViewProps {
  marker: Marker;
}

export function MarkerDetailView({
  marker,
}: MarkerDetailViewProps): ReactElement {
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
          href={`/${marker.id}`}
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
          <p className="text-sm text-slate-500">
            by{" "}
            <span className="font-medium text-slate-700">{marker.userId}</span>
            {" · "}
            {datetime !== postedAt ? `${datetime} · posted ${postedAt}` : postedAt}
          </p>
        </header>

        <div className="prose prose-slate max-w-none font-serif">
          <MDXRemote source={marker.markdown} />
        </div>
      </article>
    </div>
  );
}
