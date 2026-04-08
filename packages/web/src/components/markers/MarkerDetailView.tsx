import type { ReactElement } from "react";
import Image from "next/image";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { compileMDX } from "next-mdx-remote/rsc";
import type { Marker } from "@at-2/shared";
import { resolveImageUrl } from "@/lib/r2-url";

const r2BaseUrl = process.env["NEXT_PUBLIC_R2_PUBLIC_URL"] ?? "";

function MdxImage({
  src,
  alt,
  images,
}: {
  src?: string;
  alt?: string;
  images: Marker["images"];
}): ReactElement {
  const imageEntry = images?.find((img) => img.name === src);
  const resolved = imageEntry
    ? `${r2BaseUrl}/${imageEntry.r2Path}`
    : (src ?? "");
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={resolved} alt={alt ?? ""} className="max-w-full rounded" />
  );
}

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

  const imageUrl = resolveImageUrl(marker.snippetImage);

  const markerImages = marker.images ?? [];

  let bodyContent: ReactElement;
  if (!marker.markdown || marker.markdown.trim() === "") {
    bodyContent = (
      <p className="text-slate-500 italic">No content available.</p>
    );
  } else {
    try {
      const { content } = await compileMDX({
        source: marker.markdown,
        components: {
          img: ({ src, alt }: { src?: string; alt?: string }) => (
            <MdxImage src={src} alt={alt} images={markerImages} />
          ),
        },
      });
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
              href={`/${marker.id}/edit`}
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
