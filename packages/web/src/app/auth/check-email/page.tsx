import type { ReactNode } from "react";

export default function CheckEmailPage(): ReactNode {
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-3">
        Check your email
      </h1>
      <p className="text-sm text-slate-600 mb-4">
        We sent you a link. Click it to continue.
      </p>
      <p className="text-sm text-slate-600">
        <a href="/auth/signin" className="text-brand-blue hover:underline">
          Back to sign in
        </a>
      </p>
    </div>
  );
}
