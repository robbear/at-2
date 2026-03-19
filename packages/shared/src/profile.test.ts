import { describe, it, expect } from "vitest";
import { ProfileSchema } from "./profile.js";

const validProfile = {
  _id: "auth-user-id-123",
  userId: "robbearman",
  email: "rob@example.com",
  name: "Rob Bear",
  createdAt: new Date("2024-01-01T00:00:00Z"),
};

describe("ProfileSchema", () => {
  it("accepts a well-formed Profile", () => {
    const result = ProfileSchema.safeParse(validProfile);
    expect(result.success).toBe(true);
  });

  it("accepts a Profile with optional fields", () => {
    const withOptionals = {
      ...validProfile,
      profilePicUrl: "accounts/robbearman/profile/avatar.jpg",
      bio: "I make things.",
    };
    const result = ProfileSchema.safeParse(withOptionals);
    expect(result.success).toBe(true);
  });

  it("rejects a Profile with an invalid email", () => {
    const invalid = { ...validProfile, email: "not-an-email" };
    const result = ProfileSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects a Profile missing required fields", () => {
    const { email, ...withoutEmail } = validProfile;
    const result = ProfileSchema.safeParse(withoutEmail);
    expect(result.success).toBe(false);
  });
});
