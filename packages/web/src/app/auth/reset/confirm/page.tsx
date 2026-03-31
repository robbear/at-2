"use client";

import { Suspense } from "react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { resetPasswordAction } from "../../actions";
import type { ReactNode } from "react";

function ResetConfirmForm(): ReactNode {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [error, dispatch, pending] = useActionState(resetPasswordAction, null);

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-6">
        Set new password
      </h1>
      <form action={dispatch} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <div className="space-y-1">
          <label
            htmlFor="newPassword"
            className="text-sm font-medium text-slate-700"
          >
            New password
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            className="w-full"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="confirmPassword"
            className="text-sm font-medium text-slate-700"
          >
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            className="w-full"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-500">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full bg-brand-blue text-white py-2 px-4 rounded-md font-medium hover:bg-brand-blue/90 disabled:opacity-60 transition-colors"
        >
          {pending ? "Saving…" : "Set password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetConfirmPage(): ReactNode {
  return (
    <Suspense>
      <ResetConfirmForm />
    </Suspense>
  );
}
