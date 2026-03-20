import type { Env } from "../env.js";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(
  options: EmailOptions,
  env: Pick<Env, "RESEND_API_KEY" | "RESEND_FROM_EMAIL">
): Promise<void> {
  if (!env.RESEND_API_KEY) {
    // Gracefully skip email sending in dev/test when Resend is not configured
    return;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(env.RESEND_API_KEY);

  await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}

export async function sendVerificationEmail(
  to: string,
  token: string,
  env: Pick<Env, "RESEND_API_KEY" | "RESEND_FROM_EMAIL" | "APP_URL">
): Promise<void> {
  const url = `${env.APP_URL}/auth/verify?token=${encodeURIComponent(token)}`;
  await sendEmail(
    {
      to,
      subject: "Verify your Atlasphere email",
      html: `<p>Click the link below to verify your email address:</p>
<p><a href="${url}">${url}</a></p>
<p>This link expires in 24 hours.</p>`,
    },
    env
  );
}

export async function sendPasswordResetEmail(
  to: string,
  token: string,
  env: Pick<Env, "RESEND_API_KEY" | "RESEND_FROM_EMAIL" | "APP_URL">
): Promise<void> {
  const url = `${env.APP_URL}/auth/reset/confirm?token=${encodeURIComponent(token)}`;
  await sendEmail(
    {
      to,
      subject: "Reset your Atlasphere password",
      html: `<p>Click the link below to reset your password:</p>
<p><a href="${url}">${url}</a></p>
<p>This link expires in 1 hour. If you did not request a password reset, you can ignore this email.</p>`,
    },
    env
  );
}
