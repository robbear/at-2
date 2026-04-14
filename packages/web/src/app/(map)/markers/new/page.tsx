"use client";

import { useEffect } from "react";
import type { ReactElement } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { EditorView } from "@/components/editor/EditorView";

export default function NewMarkerPage(): ReactElement | null {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(
        `/auth/signin?callbackUrl=${encodeURIComponent("/markers/new")}`,
      );
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-slate-500 text-sm">Loading…</span>
      </div>
    );
  }

  if (!session) return null;

  return (
    <EditorView
      mode="create"
      providerOverride={process.env["MAP_PROVIDER_OVERRIDE"]}
      defaultProvider={process.env["MAP_DEFAULT_PROVIDER"]}
    />
  );
}
