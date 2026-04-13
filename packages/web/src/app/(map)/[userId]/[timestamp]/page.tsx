import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { ReactElement } from "react";
import type { Metadata } from "next";
import type { Marker } from "@at-2/shared";
import { MarkerPreviewPanel } from "@/components/markers/MarkerPreviewPanel";
import { MarkerBody } from "@/components/markers/MarkerBody";
import { getApiUrl } from "@/lib/api-url";
import { getBaseUrl } from "@/lib/base-url";

interface PageParams {
  params: Promise<{ userId: string; timestamp: string }>;
  searchParams: Promise<Record<string, string | string[]>>;
}

async function fetchMarker(
  userId: string,
  timestamp: string,
): Promise<Marker | null> {
  try {
    const res = await fetch(
      `${getApiUrl()}/api/v1/markers/${encodeURIComponent(userId)}/${encodeURIComponent(timestamp)}`,
      { next: { revalidate: 60 } },
    );
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as Marker;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string; timestamp: string }>;
}): Promise<Metadata> {
  const { userId, timestamp } = await params;
  const marker = await fetchMarker(userId, timestamp);
  if (!marker) return {};

  const baseUrl = getBaseUrl();
  const r2BaseUrl = process.env["NEXT_PUBLIC_R2_PUBLIC_URL"] ?? "";

  const imageUrl = marker.snippetImage
    ? marker.snippetImage.startsWith("http")
      ? marker.snippetImage
      : `${r2BaseUrl}/${marker.snippetImage}`
    : `${baseUrl}/images/atlasphere-green-on-blue.svg`;

  const description =
    marker.snippetText?.trim() || "View this location on Atlasphere.";
  const canonicalUrl = `${baseUrl}/${marker.id}`;

  return {
    title: marker.title,
    description,
    openGraph: {
      title: marker.title,
      description,
      url: canonicalUrl,
      type: "article",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: marker.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: marker.title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function MarkerPreviewPage({
  params,
  searchParams,
}: PageParams): Promise<ReactElement> {
  const { userId, timestamp } = await params;
  const resolvedSearch = await searchParams;
  const marker = await fetchMarker(userId, timestamp);

  if (!marker) {
    notFound();
  }

  const searchString = new URLSearchParams(
    Object.entries(resolvedSearch).flatMap(([k, v]) =>
      Array.isArray(v) ? v.map((val) => [k, val]) : [[k, v]],
    ),
  ).toString();

  return (
    <Suspense>
      <MarkerPreviewPanel marker={marker}>
        <MarkerBody marker={marker} searchString={searchString} />
      </MarkerPreviewPanel>
    </Suspense>
  );
}
