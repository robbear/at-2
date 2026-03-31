import { verifyEmailAction } from "../actions";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyPage({
  searchParams,
}: Props): Promise<ReactNode> {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-slate-900 mb-3">
          Invalid link
        </h1>
        <p className="text-sm text-slate-600">
          The verification link is missing a token.
        </p>
      </div>
    );
  }

  const error = await verifyEmailAction(token);

  if (error) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-slate-900 mb-3">
          Verification failed
        </h1>
        <p className="text-sm text-slate-600 mb-4">{error}</p>
        <p className="text-sm text-slate-600">
          <a href="/auth/signin" className="text-brand-blue hover:underline">
            Back to sign in
          </a>
        </p>
      </div>
    );
  }

  redirect("/auth/signin?verified=1");
}
