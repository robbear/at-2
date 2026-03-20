"use client";

import { useActionState } from "react";
import { registerAction } from "../actions.js";
import type { ReactNode } from "react";

export default function RegisterPage(): ReactNode {
  const [error, dispatch, pending] = useActionState(registerAction, null);

  return (
    <main>
      <h1>Create account</h1>
      <form action={dispatch}>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required autoComplete="new-password" minLength={8} />
        </div>
        <div>
          <label htmlFor="confirmPassword">Confirm password</label>
          <input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" minLength={8} />
        </div>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p>
        <a href="/auth/signin">Already have an account?</a>
      </p>
    </main>
  );
}
