"use client";

import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { Marker } from "@at-2/shared";
import { EditorView } from "@/components/editor/EditorView";
import { fetchMarkerAction } from "@/app/(map)/markers/actions";

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
      const m = await fetchMarkerAction(userId, timestamp);
      if (!m) {
        setFetchError("not-found");
        return;
      }
      if (!session || m.userId !== session.user?.userId) {
        setFetchError("forbidden");
        return;
      }
      setMarker(m);
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

  return (
    <EditorView
      mode="edit"
      marker={marker}
      providerOverride={process.env["MAP_PROVIDER_OVERRIDE"]}
      defaultProvider={process.env["MAP_DEFAULT_PROVIDER"]}
    />
  );
}
