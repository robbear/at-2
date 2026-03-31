import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { ReactElement } from "react";
import type { Marker } from "@at-2/shared";
import { MarkerPreviewPanel } from "@/components/markers/MarkerPreviewPanel";
import { getApiUrl } from "@/lib/api-url";

interface PageParams {
  params: Promise<{ userId: string; timestamp: string }>;
}

async function fetchMarker(
  userId: string,
  timestamp: string,
): Promise<Marker | null> {
  const markerId = `${userId}/${timestamp}`;
  try {
    const res = await fetch(`${getApiUrl()}/api/v1/markers/${encodeURIComponent(markerId)}`, {
      next: { revalidate: 60 },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as Marker;
  } catch {
    return null;
  }
}

export default async function MarkerPreviewPage({
  params,
}: PageParams): Promise<ReactElement> {
  const { userId, timestamp } = await params;
  const marker = await fetchMarker(userId, timestamp);

  if (!marker) {
    notFound();
  }

  return (
    <Suspense>
      <MarkerPreviewPanel marker={marker} />
    </Suspense>
  );
}
