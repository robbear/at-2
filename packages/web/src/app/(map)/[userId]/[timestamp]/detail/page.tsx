import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import type { Marker } from "@at-2/shared";
import { MarkerDetailView } from "@/components/markers/MarkerDetailView";
import { getApiUrl } from "@/lib/api-url";

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

export default async function MarkerDetailPage({
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

  return <MarkerDetailView marker={marker} searchString={searchString} />;
}
