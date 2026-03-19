"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { resetPasswordAction } from "../../actions.js";
import type { ReactNode } from "react";

export default function ResetConfirmPage(): ReactNode {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [error, dispatch, pending] = useActionState(resetPasswordAction, null);

  return (
    <main>
      <h1>Set new password</h1>
      <form action={dispatch}>
        <input type="hidden" name="token" value={token} />
        <div>
          <label htmlFor="newPassword">New password</label>
          <input id="newPassword" name="newPassword" type="password" required autoComplete="new-password" minLength={8} />
        </div>
        <div>
          <label htmlFor="confirmPassword">Confirm password</label>
          <input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" minLength={8} />
        </div>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Set password"}
        </button>
      </form>
    </main>
  );
}
