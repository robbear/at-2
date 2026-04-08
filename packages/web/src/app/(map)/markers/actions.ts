"use server";

import { cookies } from "next/headers";
import type { Marker } from "@at-2/shared";
import { getApiUrl } from "@/lib/api-url";

const COOKIE_NAME = "atlasphere.session-token";

/**
 * Reads the Auth.js session JWT from the httpOnly cookie and returns it as a
 * Bearer token string, or null if the user is not signed in.
 */
async function getSessionToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value ?? null;
}

// ─── Fetch single marker ──────────────────────────────────────────────────────

export async function fetchMarkerAction(
  userId: string,
  timestamp: string,
): Promise<Marker | null> {
  try {
    const res = await fetch(
      `${getApiUrl()}/api/v1/markers/${encodeURIComponent(userId)}/${encodeURIComponent(timestamp)}`,
    );
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as Marker;
  } catch {
    return null;
  }
}

// ─── Presign ─────────────────────────────────────────────────────────────────

export interface PresignResult {
  uploadUrl: string;
  r2Path: string;
}

export async function presignUploadAction(
  filename: string,
  contentType: string,
  markerTimestamp: number,
): Promise<PresignResult> {
  const token = await getSessionToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${getApiUrl()}/api/v1/upload/presign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      filename,
      contentType,
      purpose: "marker-image",
      markerTimestamp,
    }),
  });

  if (!res.ok) {
    throw new Error(`Presign failed: ${res.status}`);
  }

  return res.json() as Promise<PresignResult>;
}

// ─── Create marker ────────────────────────────────────────────────────────────

export async function createMarkerAction(
  payload: Record<string, unknown>,
): Promise<Marker> {
  const token = await getSessionToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${getApiUrl()}/api/v1/markers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`Create failed: ${res.status}`);
  return res.json() as Promise<Marker>;
}

// ─── Update marker ────────────────────────────────────────────────────────────

export async function updateMarkerAction(
  userId: string,
  timestamp: string,
  payload: Record<string, unknown>,
): Promise<Marker> {
  const token = await getSessionToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(
    `${getApiUrl()}/api/v1/markers/${encodeURIComponent(userId)}/${encodeURIComponent(timestamp)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) throw new Error(`Update failed: ${res.status}`);
  return res.json() as Promise<Marker>;
}

// ─── Delete marker ────────────────────────────────────────────────────────────

export async function deleteMarkerAction(
  userId: string,
  timestamp: string,
): Promise<void> {
  const token = await getSessionToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(
    `${getApiUrl()}/api/v1/markers/${encodeURIComponent(userId)}/${encodeURIComponent(timestamp)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}
