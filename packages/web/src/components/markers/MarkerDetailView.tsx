import type { ReactElement } from "react";
import Image from "next/image";
import Link from "next/link";
import { compileMDX } from "next-mdx-remote/rsc";
import type { Marker } from "@at-2/shared";
import { resolveImageUrl } from "@/lib/r2-url";

interface MarkerDetailViewProps {
  marker: Marker;
}

export async function MarkerDetailView({
  marker,
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

  const imageUrl = resolveImageUrl(marker.snippetImage);

  let bodyContent: ReactElement;
  if (!marker.markdown || marker.markdown.trim() === "") {
    bodyContent = (
      <p className="text-slate-500 italic">No content available.</p>
    );
  } else {
    try {
      const { content } = await compileMDX({ source: marker.markdown });
      bodyContent = content;
    } catch {
      // v1 data may contain custom extension syntax (e.g. [[youtube:id]]) that
      // is not valid MDX. Fall back to displaying the raw source as plain text.
      bodyContent = (
        <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">
          {marker.markdown}
        </pre>
      );
    }
  }

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

        {imageUrl && (
          <div className="relative w-full aspect-video mb-6 rounded-lg overflow-hidden">
            <Image
              src={imageUrl}
              alt={marker.title}
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        )}

        <div className="prose prose-slate max-w-none font-serif">
          {bodyContent}
        </div>
      </article>
    </div>
  );
}
