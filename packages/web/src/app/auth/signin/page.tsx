"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import type { ReactNode } from "react";

function errorMessage(code: string | null | undefined): string {
  if (code === "NO_PASSWORD") {
    return "No password set. Please use the password reset flow to create one.";
  }
  if (code === "EMAIL_NOT_VERIFIED") {
    return "Please verify your email address before signing in. Check your inbox.";
  }
  return "Sign in failed. Please check your credentials.";
}

function SignInForm(): ReactNode {
  const router = useRouter();
  const { update } = useSession();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const urlCode = searchParams.get("code");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(
    urlError === "CredentialsSignin" ? errorMessage(urlCode) : null,
  );

  const noPasswordError =
    urlError === "CredentialsSignin" && urlCode === "NO_PASSWORD";

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (
      form.elements.namedItem("password") as HTMLInputElement
    ).value;

    setPending(true);
    setFormError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setFormError(errorMessage(result.code));
      setPending(false);
      return;
    }

    await update();
    router.push("/");
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Sign in</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
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
            autoComplete="current-password"
            className="w-full"
          />
        </div>
        {formError && (
          <p role="alert" className="text-sm text-red-500">
            {formError}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full bg-brand-blue text-white py-2 px-4 rounded-md font-medium hover:bg-brand-blue/90 disabled:opacity-60 transition-colors"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600 space-x-2">
        <a href="/auth/register" className="text-brand-blue hover:underline">
          Create an account
        </a>
        <span>·</span>
        <a href="/auth/reset" className="text-brand-blue hover:underline">
          {noPasswordError ? "Set a password" : "Forgot password?"}
        </a>
      </p>
    </div>
  );
}

export default function SignInPage(): ReactNode {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
