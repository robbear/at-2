"use server";

import { signOut } from "../../auth";
import { RegistrationSchema, PasswordResetRequestSchema, PasswordResetSchema } from "@at-2/shared";
import { getApiUrl } from "@/lib/api-url";
import { getBaseUrl } from "@/lib/base-url";
import { redirect } from "next/navigation";

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

export async function registerAction(
  _prev: string | null,
  formData: FormData
): Promise<string | null> {
  const parsed = RegistrationSchema.safeParse({
    email: formData.get("email"),
    username: formData.get("username"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input";
  }

  const res = await fetch(`${getApiUrl()}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-App-URL": getBaseUrl() },
    body: JSON.stringify(parsed.data),
  });

  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    return body.error ?? "Registration failed";
  }

  redirect("/auth/check-email");
}

export async function resetRequestAction(
  _prev: string | null,
  formData: FormData
): Promise<string | null> {
  const parsed = PasswordResetRequestSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid email";
  }

  await fetch(`${getApiUrl()}/api/v1/auth/reset-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-App-URL": getBaseUrl() },
    body: JSON.stringify(parsed.data),
  });

  redirect("/auth/check-email");
}

export async function resetPasswordAction(
  _prev: string | null,
  formData: FormData
): Promise<string | null> {
  const parsed = PasswordResetSchema.safeParse({
    token: formData.get("token"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input";
  }

  const res = await fetch(`${getApiUrl()}/api/v1/auth/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
  });

  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    return body.error ?? "Password reset failed";
  }

  redirect("/auth/signin?reset=1");
}

export async function verifyEmailAction(token: string): Promise<string | null> {
  const res = await fetch(`${getApiUrl()}/api/v1/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    return body.error ?? "Verification failed";
  }

  return null;
}
