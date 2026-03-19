import mongoose, { Schema, type Model } from "mongoose";
import type { Profile } from "@at-2/shared";

const profileSchema = new Schema<Profile>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    profilePicUrl: { type: String },
    bio: { type: String },
    createdAt: { type: Date, required: true },
    passwordHash: { type: String, index: true, sparse: true },
    emailVerified: { type: Boolean, required: true, default: false },
    verificationToken: { type: String, index: true, sparse: true },
    resetToken: { type: String, index: true, sparse: true },
  },
  {
    // _id is managed by us (string), not Mongoose's ObjectId
    _id: false,
    versionKey: false,
  }
);

// Lazy getter prevents "Cannot overwrite model" errors when the module is
// imported multiple times (e.g., across test files in the same process).
export function getProfileModel(): Model<Profile> {
  return (
    (mongoose.models["Profile"] as Model<Profile> | undefined) ??
    mongoose.model<Profile>("Profile", profileSchema)
  );
}
