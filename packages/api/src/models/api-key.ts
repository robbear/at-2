import mongoose, { Schema, type Model } from "mongoose";

export interface ApiKeyDoc {
  _id: mongoose.Types.ObjectId;
  keyHash: string;   // SHA-256 of the raw key
  profileId: string; // Profile._id — for resolving request.user.id
  userId: string;    // public handle (e.g. "robbearman")
  label: string;
  createdAt: Date;
  lastUsedAt?: Date;
}

const apiKeySchema = new Schema<ApiKeyDoc>(
  {
    keyHash:   { type: String, required: true, unique: true, index: true },
    profileId: { type: String, required: true },
    userId:    { type: String, required: true, index: true },
    label:     { type: String, required: true },
    createdAt: { type: Date,   required: true, default: () => new Date() },
    lastUsedAt:{ type: Date },
  },
  { versionKey: false }
);

export function getApiKeyModel(): Model<ApiKeyDoc> {
  return (
    (mongoose.models["ApiKey"] as Model<ApiKeyDoc> | undefined) ??
    mongoose.model<ApiKeyDoc>("ApiKey", apiKeySchema)
  );
}
