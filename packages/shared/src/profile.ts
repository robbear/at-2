import { z } from "zod";

export const ProfileSchema = z.object({
  _id: z.string(), // Auth.js user ID
  userId: z.string(), // public handle
  email: z.string().email(),
  name: z.string(),
  profilePicUrl: z.string().optional(),
  bio: z.string().optional(),
  createdAt: z.coerce.date(),
  // Auth fields — absent on v1 profiles that haven't migrated yet
  passwordHash: z.string().optional(),
  emailVerified: z.boolean().default(false),
  verificationToken: z.string().optional(),
  resetToken: z.string().optional(),
});

export type Profile = z.infer<typeof ProfileSchema>;
