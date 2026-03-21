import { verifyEmailAction } from "../actions";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyPage({ searchParams }: Props): Promise<ReactNode> {
  const { token } = await searchParams;

  if (!token) {
    return (
      <main>
        <h1>Invalid link</h1>
        <p>The verification link is missing a token.</p>
      </main>
    );
  }

  const error = await verifyEmailAction(token);

  if (error) {
    return (
      <main>
        <h1>Verification failed</h1>
        <p>{error}</p>
        <p>
          <a href="/auth/signin">Back to sign in</a>
        </p>
      </main>
    );
  }

  redirect("/auth/signin?verified=1");
}
