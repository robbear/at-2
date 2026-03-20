"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction } from "../actions.js";
import type { ReactNode } from "react";

function errorMessage(code: string | null): string {
  if (code === "NO_PASSWORD") {
    return "No password set. Please use the password reset flow to create one.";
  }
  if (code === "EMAIL_NOT_VERIFIED") {
    return "Please verify your email address before signing in. Check your inbox.";
  }
  return "Sign in failed. Please check your credentials.";
}

export default function SignInPage(): ReactNode {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const urlCode = searchParams.get("code");

  const [actionError, dispatch, pending] = useActionState<string | null, FormData>(
    async (_prev, formData) => {
      try {
        await signInAction(formData);
        return null;
      } catch {
        return "Sign in failed. Please check your credentials.";
      }
    },
    null
  );

  // URL error params come from server-side redirects (e.g. CredentialsSignin with code)
  const displayError =
    actionError ??
    (urlError === "CredentialsSignin" ? errorMessage(urlCode) : null);

  const noPasswordError = urlError === "CredentialsSignin" && urlCode === "NO_PASSWORD";

  return (
    <main>
      <h1>Sign in</h1>
      <form action={dispatch}>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        {displayError && <p role="alert">{displayError}</p>}
        <button type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p>
        <a href="/auth/register">Create an account</a>
        {" · "}
        <a href="/auth/reset">{noPasswordError ? "Set a password" : "Forgot password?"}</a>
      </p>
    </main>
  );
}
