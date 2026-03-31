"use client";

import { useActionState } from "react";
import { registerAction } from "../actions";
import type { ReactNode } from "react";

export default function RegisterPage(): ReactNode {
  const [error, dispatch, pending] = useActionState(registerAction, null);

  const usernameError = error === "Username already taken" ? error : null;
  const globalError = error && !usernameError ? error : null;

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-6">
        Create account
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
        <div className="space-y-1">
          <label
            htmlFor="username"
            className="text-sm font-medium text-slate-700"
          >
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            autoComplete="username"
            minLength={3}
            maxLength={30}
            pattern="[a-zA-Z0-9_\-]+"
            className="w-full"
          />
          <small className="text-xs text-slate-500">
            3–30 characters, letters, numbers, hyphens, and underscores
          </small>
          {usernameError && (
            <p role="alert" className="text-sm text-red-500">
              {usernameError}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <label
            htmlFor="password"
            className="text-sm font-medium text-slate-700"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
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
        {globalError && (
          <p role="alert" className="text-sm text-red-500">
            {globalError}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full bg-brand-blue text-white py-2 px-4 rounded-md font-medium hover:bg-brand-blue/90 disabled:opacity-60 transition-colors"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        <a href="/auth/signin" className="text-brand-blue hover:underline">
          Already have an account?
        </a>
      </p>
    </div>
  );
}
