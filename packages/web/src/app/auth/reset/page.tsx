"use client";

import { useActionState } from "react";
import { resetRequestAction } from "../actions";
import type { ReactNode } from "react";

export default function ResetPage(): ReactNode {
  const [error, dispatch, pending] = useActionState(resetRequestAction, null);

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-6">
        Reset password
      </h1>
      <form action={dispatch} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
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
          {pending ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        <a href="/auth/signin" className="text-brand-blue hover:underline">
          Back to sign in
        </a>
      </p>
    </div>
  );
}
