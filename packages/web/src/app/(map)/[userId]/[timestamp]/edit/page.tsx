"use client";

import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { Marker } from "@at-2/shared";
import { EditorView } from "@/components/editor/EditorView";
import { getApiUrl } from "@/lib/api-url";

export default function EditMarkerPage(): ReactElement | null {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();

  const userId =
    typeof params["userId"] === "string" ? params["userId"] : "";
  const timestamp =
    typeof params["timestamp"] === "string" ? params["timestamp"] : "";

  const [marker, setMarker] = useState<Marker | null>(null);
  const [fetchError, setFetchError] = useState<"not-found" | "forbidden" | null>(
    null,
  );

  // Auth guard
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      const callbackUrl = encodeURIComponent(
        `/${userId}/${timestamp}/edit`,
      );
      router.push(`/auth/signin?callbackUrl=${callbackUrl}`);
    }
  }, [authStatus, router, userId, timestamp]);

  // Fetch marker
  useEffect(() => {
    if (authStatus !== "authenticated" || !userId || !timestamp) return;

    async function load(): Promise<void> {
      try {
        const res = await fetch(
          `${getApiUrl()}/api/v1/markers/${encodeURIComponent(userId)}/${encodeURIComponent(timestamp)}`,
          { credentials: "include" },
        );
        if (res.status === 404) {
          setFetchError("not-found");
          return;
        }
        if (!res.ok) {
          setFetchError("not-found");
          return;
        }
        const m = (await res.json()) as Marker;
        // Ownership check
        if (!session || m.userId !== session.user?.userId) {
          setFetchError("forbidden");
          return;
        }
        setMarker(m);
      } catch {
        setFetchError("not-found");
      }
    }

    void load();
  }, [authStatus, session, userId, timestamp]);

  if (authStatus === "loading" || (authStatus === "authenticated" && !marker && !fetchError)) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-slate-500 text-sm">Loading…</span>
      </div>
    );
  }

  if (!session) return null;

  if (fetchError === "forbidden") {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-red-600 text-sm">
          You do not have permission to edit this marker.
        </p>
      </div>
    );
  }

  if (fetchError === "not-found") {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-500 text-sm">Marker not found.</p>
      </div>
    );
  }

  if (!marker) return null;

  return <EditorView mode="edit" marker={marker} />;
}
