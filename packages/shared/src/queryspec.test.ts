import { describe, it, expect } from "vitest";
import { QuerySpecSchema } from "./queryspec.js";

describe("QuerySpecSchema", () => {
  it("accepts an empty QuerySpec", () => {
    const result = QuerySpecSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allTags).toBe(false);
    }
  });

  it("accepts a full QuerySpec", () => {
    const full = {
      userIds: ["robbearman", "janesmith"],
      tags: ["hiking", "trails"],
      allTags: true,
      markerIds: ["robbearman/1708900000000"],
      near: { lat: 37.3861, lng: -122.0839, distance: 10000 },
      dateRange: {
        start: "2024-01-01",
        end: "2024-12-31",
        usePosttime: false,
      },
    };
    const result = QuerySpecSchema.safeParse(full);
    expect(result.success).toBe(true);
  });

  it("defaults near.distance to 40000 when not provided", () => {
    const withNear = {
      near: { lat: 37.3861, lng: -122.0839 },
    };
    const result = QuerySpecSchema.safeParse(withNear);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.near?.distance).toBe(40000);
    }
  });

  it("rejects near with non-numeric coordinates", () => {
    const invalid = {
      near: { lat: "not-a-number", lng: -122.0839 },
    };
    const result = QuerySpecSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
