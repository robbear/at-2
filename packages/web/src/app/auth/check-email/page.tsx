import type { ReactNode } from "react";

export default function CheckEmailPage(): ReactNode {
  return (
    <main>
      <h1>Check your email</h1>
      <p>We sent you a link. Click it to continue.</p>
      <p>
        <a href="/auth/signin">Back to sign in</a>
      </p>
    </main>
  );
}
