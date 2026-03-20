"use client";

import { useActionState } from "react";
import { signInAction } from "../actions.js";
import type { ReactNode } from "react";

export default function SignInPage(): ReactNode {
  const [error, dispatch, pending] = useActionState<string | null, FormData>(
    async (_prev, formData) => {
      try {
        await signInAction(formData);
        return null;
      } catch {
        return "Invalid email or password";
      }
    },
    null
  );

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
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p>
        <a href="/auth/register">Create an account</a>
        {" · "}
        <a href="/auth/reset">Forgot password?</a>
      </p>
    </main>
  );
}
