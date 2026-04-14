"use client";

import type { ReactNode } from "react";
import type { Session } from "next-auth";
import { SessionProvider, useSession } from "next-auth/react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",
    capture_pageview: true,
    capture_pageleave: true,
    persistence: "localStorage",
  });
  posthog.register({ env: process.env.NEXT_PUBLIC_APP_ENV ?? "development" });
}

/** Identifies the signed-in user to PostHog when the session loads. */
function PostHogIdentify(): null {
  const { data: session } = useSession();
  useEffect(() => {
    const userId = (session?.user as { userId?: string } | undefined)?.userId;
    if (userId) {
      posthog.identify(userId, { email: session?.user?.email ?? undefined });
    }
  }, [session]);
  return null;
}

interface ProvidersProps {
  children: ReactNode;
  session: Session | null;
}

export function Providers({ children, session }: ProvidersProps): ReactNode {
  return (
    <SessionProvider session={session}>
      <PHProvider client={posthog}>
        <PostHogIdentify />
        {children}
      </PHProvider>
    </SessionProvider>
  );
}
