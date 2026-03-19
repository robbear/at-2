import { z } from "zod";

export const ProfileSchema = z.object({
  _id: z.string(), // Auth.js user ID
  userId: z.string(), // public handle
  email: z.string().email(),
  name: z.string(),
  profilePicUrl: z.string().optional(),
  bio: z.string().optional(),
  createdAt: z.coerce.date(),
});

export type Profile = z.infer<typeof ProfileSchema>;
