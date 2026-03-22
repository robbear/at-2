"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";
import { signInAction } from "../actions";
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

function SubmitButton(): ReactNode {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

function SignInForm(): ReactNode {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const urlCode = searchParams.get("code");

  const displayError =
    urlError === "CredentialsSignin" ? errorMessage(urlCode) : null;

  const noPasswordError = urlError === "CredentialsSignin" && urlCode === "NO_PASSWORD";

  return (
    <main>
      <h1>Sign in</h1>
      <form action={signInAction}>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        {displayError && <p role="alert">{displayError}</p>}
        <SubmitButton />
      </form>
      <p>
        <a href="/auth/register">Create an account</a>
        {" · "}
        <a href="/auth/reset">{noPasswordError ? "Set a password" : "Forgot password?"}</a>
      </p>
    </main>
  );
}

export default function SignInPage(): ReactNode {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
