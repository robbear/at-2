"use client";

import { useActionState } from "react";
import { resetRequestAction } from "../actions.js";
import type { ReactNode } from "react";

export default function ResetPage(): ReactNode {
  const [error, dispatch, pending] = useActionState(resetRequestAction, null);

  return (
    <main>
      <h1>Reset password</h1>
      <form action={dispatch}>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p>
        <a href="/auth/signin">Back to sign in</a>
      </p>
    </main>
  );
}
