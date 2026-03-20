"use client";

import { useActionState } from "react";
import { registerAction } from "../actions.js";
import type { ReactNode } from "react";

export default function RegisterPage(): ReactNode {
  const [error, dispatch, pending] = useActionState(registerAction, null);

  const usernameError = error === "Username already taken" ? error : null;
  const globalError = error && !usernameError ? error : null;

  return (
    <main>
      <h1>Create account</h1>
      <form action={dispatch}>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            required
            autoComplete="username"
            minLength={3}
            maxLength={30}
            pattern="[a-zA-Z0-9_\-]+"
          />
          <small>3–30 characters, letters, numbers, hyphens, and underscores</small>
          {usernameError && <p role="alert">{usernameError}</p>}
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required autoComplete="new-password" minLength={8} />
        </div>
        <div>
          <label htmlFor="confirmPassword">Confirm password</label>
          <input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" minLength={8} />
        </div>
        {globalError && <p role="alert">{globalError}</p>}
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
