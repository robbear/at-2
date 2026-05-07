"use server";

import { cookies } from "next/headers";
import { auth } from "@/auth";
import { getApiUrl } from "@/lib/api-url";
import { revalidatePath } from "next/cache";

const COOKIE_NAME = "atlasphere.session-token";

async function getToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value ?? null;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ApiKeyMeta {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface CreatedApiKey extends ApiKeyMeta {
  key: string;
}

export interface ProfileData {
  userId: string;
  name: string;
  bio?: string | null;
  profilePicUrl?: string | null;
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function updateProfileAction(data: {
  name: string;
  bio?: string;
  profilePicUrl?: string;
}): Promise<{ error?: string }> {
  const session = await auth();
  const userId = session?.user?.userId;
  if (!userId) return { error: "Not authenticated" };

  const token = await getToken();
  const res = await fetch(
    `${getApiUrl()}/api/v1/profiles/${encodeURIComponent(userId)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token ?? ""}`,
      },
      body: JSON.stringify(data),
    },
  );

  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    return { error: body.error ?? "Failed to update profile" };
  }

  revalidatePath("/settings");
  return {};
}

export async function presignProfilePicAction(
  contentType: string,
): Promise<{ uploadUrl: string; publicUrl: string } | { error: string }> {
  const token = await getToken();
  if (!token) return { error: "Not authenticated" };

  const res = await fetch(`${getApiUrl()}/api/v1/upload/presign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ filename: "avatar.jpg", contentType, purpose: "profile" }),
  });

  if (!res.ok) return { error: "Failed to get upload URL" };
  const data = (await res.json()) as { uploadUrl: string; r2Path: string; publicUrl: string };
  return { uploadUrl: data.uploadUrl, publicUrl: data.publicUrl };
}

// ─── API keys ─────────────────────────────────────────────────────────────────

export async function createApiKeyAction(
  label: string,
): Promise<{ error?: string; key?: CreatedApiKey }> {
  const token = await getToken();
  if (!token) return { error: "Not authenticated" };

  const res = await fetch(`${getApiUrl()}/api/v1/auth/api-keys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ label }),
  });

  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    return { error: body.error ?? "Failed to create key" };
  }

  revalidatePath("/settings");
  const data = (await res.json()) as CreatedApiKey;
  return { key: data };
}

export async function deleteApiKeyAction(id: string): Promise<{ error?: string }> {
  const token = await getToken();
  if (!token) return { error: "Not authenticated" };

  const res = await fetch(
    `${getApiUrl()}/api/v1/auth/api-keys/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    return { error: body.error ?? "Failed to delete key" };
  }

  revalidatePath("/settings");
  return {};
}
