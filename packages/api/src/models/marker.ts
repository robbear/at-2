import mongoose, { Schema, type Model } from "mongoose";
import type { Marker } from "@at-2/shared";

// Internal Mongoose document type: uses _id instead of id
type MarkerDoc = Omit<Marker, "id"> & { _id: string };

const markerSchema = new Schema<MarkerDoc>(
  {
    _id: { type: String, required: true }, // {userId}/{timestamp}
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    snippetText: { type: String, default: "" },
    snippetImage: { type: String, default: "" },
    contentUrl: { type: String, default: "" },
    markdown: { type: String, default: "" },
    tags: { type: [String], default: [], index: true },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    datetime: { type: Date, required: true, index: true },
    posttime: { type: Date, required: true, index: true },
    layerUrl: { type: String },
    layerType: { type: String, enum: ["kml", "geojson"], default: null },
    markerColors: {
      fill: { type: String },
      outline: { type: String },
    },
    draft: { type: Boolean, required: true, default: false },
    archived: { type: Boolean, required: true, default: false },
    deleted: { type: Boolean, required: true, default: false },
  },
  {
    versionKey: false,
    toJSON: {
      transform(_, ret: Record<string, unknown>) {
        ret["id"] = ret["_id"];
        delete ret["_id"];
        return ret;
      },
    },
  }
);

// Geospatial index required for $nearSphere queries
markerSchema.index({ location: "2dsphere" });

// Lazy getter prevents "Cannot overwrite model" errors when the module is
// imported multiple times (e.g., across test files in the same process).
export function getMarkerModel(): Model<MarkerDoc> {
  return (
    (mongoose.models["Marker"] as Model<MarkerDoc> | undefined) ??
    mongoose.model<MarkerDoc>("Marker", markerSchema)
  );
}
