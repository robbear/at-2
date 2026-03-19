import { z } from "zod";

export const RegistrationSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const PasswordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const PasswordResetSchema = z
  .object({
    token: z.string().min(1),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type Registration = z.infer<typeof RegistrationSchema>;
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;
export type PasswordReset = z.infer<typeof PasswordResetSchema>;
export type Credentials = z.infer<typeof CredentialsSchema>;
