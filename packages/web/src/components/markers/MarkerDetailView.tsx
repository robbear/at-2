import type { ReactElement, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { compileMDX } from "next-mdx-remote/rsc";
import type { Marker } from "@at-2/shared";
import { resolveImageUrl } from "@/lib/r2-url";

const r2BaseUrl = process.env["NEXT_PUBLIC_R2_PUBLIC_URL"] ?? "";

// Internal if: starts with /, has at least two non-empty path segments.
// Covers v1 (12-digit timestamps), v2 (17-digit), and any future formats.
function isInternalMarkerLink(href: string): boolean {
  if (!href.startsWith("/")) return false;
  const parts = href.replace(/^\//, "").split("/");
  return parts.length >= 2 && (parts[0]?.length ?? 0) > 0 && (parts[1]?.length ?? 0) > 0;
}

// Strip leading / and /detail suffix to get the bare markerId.
// e.g. "/robbearman/20260101120000000/detail" → "robbearman/20260101120000000"
export function extractMarkerId(href: string): string {
  return href.replace(/^\//, "").replace(/\/detail$/, "");
}

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

export function buildPreservedParams(searchString: string): string {
  return searchString ? `?${searchString}` : "";
}

export function makeAnchorComponent(
  searchString: string,
): (props: { href?: string; children?: ReactNode }) => ReactElement {
  return function AnchorComponent({
    href,
    children,
  }: {
    href?: string;
    children?: ReactNode;
  }): ReactElement {
    if (!href) return <a>{children}</a>;

    if (isInternalMarkerLink(href)) {
      const previewHref = `/${extractMarkerId(href)}`;
      const fullHref = `${previewHref}${buildPreservedParams(searchString)}`;
      return (
        <Link href={fullHref} className="text-brand-blue underline hover:opacity-80">
          {children}
        </Link>
      );
    }

    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand-blue underline hover:opacity-80"
      >
        {children}
      </a>
    );
  };
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
  const AnchorComponent = makeAnchorComponent(searchString);

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
          a: AnchorComponent,
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
