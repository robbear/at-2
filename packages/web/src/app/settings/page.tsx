import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { getApiUrl } from "@/lib/api-url";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { ApiKeysSection } from "@/components/settings/ApiKeysSection";
import type { ApiKeyMeta, ProfileData } from "./actions";

const COOKIE_NAME = "atlasphere.session-token";

export default async function SettingsPage(): Promise<ReactNode> {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const userId = session.user.userId as string;
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value ?? "";

  const [profileRes, keysRes] = await Promise.all([
    fetch(`${getApiUrl()}/api/v1/profiles/${encodeURIComponent(userId)}`, {
      cache: "no-store",
    }),
    fetch(`${getApiUrl()}/api/v1/auth/api-keys`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }),
  ]);

  const profile: ProfileData | null = profileRes.ok
    ? ((await profileRes.json()) as ProfileData)
    : null;

  const apiKeys: ApiKeyMeta[] = keysRes.ok
    ? ((await keysRes.json()) as ApiKeyMeta[])
    : [];

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
      <ProfileSection profile={profile} />
      <ApiKeysSection initialKeys={apiKeys} />
    </>
  );
}
