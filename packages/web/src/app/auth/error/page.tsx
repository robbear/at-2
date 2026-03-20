import type { ReactNode } from "react";

interface Props {
  searchParams: Promise<{ error?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Invalid email or password.",
  EMAIL_NOT_VERIFIED: "Your email is not verified. Check your inbox for the verification link.",
  NO_PASSWORD: "No password set. Use the password reset flow to create one.",
};

export default async function AuthErrorPage({ searchParams }: Props): Promise<ReactNode> {
  const { error } = await searchParams;
  const message = (error && ERROR_MESSAGES[error]) ?? "An authentication error occurred.";

  return (
    <main>
      <h1>Sign-in error</h1>
      <p>{message}</p>
      <p>
        <a href="/auth/signin">Try again</a>
      </p>
    </main>
  );
}
