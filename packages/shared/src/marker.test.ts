import { describe, it, expect } from "vitest";
import { MarkerSchema } from "./marker.js";

const validMarker = {
  id: "robbearman/1708900000000",
  userId: "robbearman",
  title: "Test Marker",
  snippetText: "A brief preview of this marker.",
  snippetImage: "accounts/robbearman/images/1708900000000/thumb.jpg",
  contentUrl: "accounts/robbearman/html/1708900000000.mdx",
  markdown: "# Hello World\n\nThis is the content.",
  tags: ["test", "scaffold"],
  location: {
    type: "Point" as const,
    coordinates: [-122.0839, 37.3861] as [number, number],
  },
  datetime: new Date("2024-02-25T12:00:00Z"),
  posttime: new Date("2024-02-25T15:30:00Z"),
  draft: false,
  archived: false,
  deleted: false,
};

describe("MarkerSchema", () => {
  it("accepts a well-formed Marker", () => {
    const result = MarkerSchema.safeParse(validMarker);
    expect(result.success).toBe(true);
  });

  it("accepts a Marker with optional fields", () => {
    const withOptionals = {
      ...validMarker,
      layerUrl: "https://example.com/layer.kml",
      layerType: "kml",
      markerColors: { fill: "#ff0000", outline: "#000000" },
    };
    const result = MarkerSchema.safeParse(withOptionals);
    expect(result.success).toBe(true);
  });

  it("rejects a Marker missing required fields", () => {
    const { title, ...withoutTitle } = validMarker;
    const result = MarkerSchema.safeParse(withoutTitle);
    expect(result.success).toBe(false);
  });

  it("rejects a Marker with invalid location type", () => {
    const invalid = {
      ...validMarker,
      location: { type: "LineString", coordinates: [-122.0839, 37.3861] },
    };
    const result = MarkerSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects a Marker with wrong id format structure", () => {
    // id must be a string — empty string is still technically valid per schema,
    // but we confirm non-string values are rejected
    const invalid = { ...validMarker, id: 12345 };
    const result = MarkerSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("coerces string dates to Date objects", () => {
    const withStringDates = {
      ...validMarker,
      datetime: "2024-02-25T12:00:00Z",
      posttime: "2024-02-25T15:30:00Z",
    };
    const result = MarkerSchema.safeParse(withStringDates);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.datetime).toBeInstanceOf(Date);
      expect(result.data.posttime).toBeInstanceOf(Date);
    }
  });
});
