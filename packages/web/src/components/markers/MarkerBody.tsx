import type { ReactElement, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { compileMDX } from "next-mdx-remote/rsc";
import type { Marker } from "@at-2/shared";
import { resolveImageUrl } from "@/lib/r2-url";
import { YouTube } from "@/components/mdx/YouTube";
import { IFrame } from "@/components/mdx/IFrame";

const r2BaseUrl = process.env["NEXT_PUBLIC_R2_PUBLIC_URL"] ?? "";

// Internal if: starts with /, has at least two non-empty path segments.
// Covers v1 (12-digit timestamps), v2 (17-digit), and any future formats.
function isInternalMarkerLink(href: string): boolean {
  if (!href.startsWith("/")) return false;
  const parts = href.replace(/^\//, "").split("/");
  return (
    parts.length >= 2 &&
    (parts[0]?.length ?? 0) > 0 &&
    (parts[1]?.length ?? 0) > 0
  );
}

// Strip leading / and /details (or legacy /detail) suffix to get the bare markerId.
// e.g. "/robbearman/20260101120000000/details" → "robbearman/20260101120000000"
export function extractMarkerId(href: string): string {
  return href.replace(/^\//, "").replace(/\/details?$/, "");
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
        <Link
          href={fullHref}
          className="text-brand-blue underline hover:opacity-80"
        >
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
  const resolved = imageEntry ? `${r2BaseUrl}/${imageEntry.r2Path}` : (src ?? "");
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={resolved} alt={alt ?? ""} className="max-w-full rounded" />;
}

interface MarkerBodyProps {
  marker: Marker;
  searchString?: string;
}

/**
 * Server component that renders the full MDX content of a marker — hero image
 * (respecting hideSnippetImageInDetails) followed by the compiled MDX prose.
 * Used by both the preview panel and the detail view.
 */
const iframeAuthorAllowlist = (process.env["IFRAME_AUTHOR_ALLOWLIST"] ?? "")
  .split(",")
  .map((id) => id.trim().toLowerCase())
  .filter(Boolean);

export async function MarkerBody({
  marker,
  searchString = "",
}: MarkerBodyProps): Promise<ReactElement> {
  const imageUrl = resolveImageUrl(marker.snippetImage);
  const markerImages = marker.images ?? [];
  const AnchorComponent = makeAnchorComponent(searchString);
  const canUseIframe =
    iframeAuthorAllowlist.length === 0 ||
    iframeAuthorAllowlist.includes(marker.userId.toLowerCase());

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
          YouTube,
          IFrame: canUseIframe ? IFrame : () => null,
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
    <>
      {imageUrl && !marker.hideSnippetImageInDetails && (
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
      <div className="prose prose-slate max-w-none font-serif">{bodyContent}</div>
    </>
  );
}
