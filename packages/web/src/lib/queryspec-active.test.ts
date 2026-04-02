import { describe, it, expect } from "vitest";
import { isQuerySpecActive } from "./queryspec-active";

describe("isQuerySpecActive", () => {
  it("returns false for empty params", () => {
    expect(isQuerySpecActive(new URLSearchParams())).toBe(false);
  });

  it("returns false for viewport-only params", () => {
    expect(
      isQuerySpecActive(new URLSearchParams("lat=37.3861&lng=-122.0839&zoom=10")),
    ).toBe(false);
  });

  it("returns true when tags present", () => {
    expect(isQuerySpecActive(new URLSearchParams("tags=hiking"))).toBe(true);
  });

  it("returns true when userIds present", () => {
    expect(isQuerySpecActive(new URLSearchParams("userIds=robbearman"))).toBe(true);
  });

  it("returns true when near.lat present", () => {
    expect(
      isQuerySpecActive(
        new URLSearchParams("near.lat=37.3861&near.lng=-122.0839&near.distance=10000"),
      ),
    ).toBe(true);
  });

  it("returns true when dateRange.start present", () => {
    expect(
      isQuerySpecActive(new URLSearchParams("dateRange.start=2024-01-01")),
    ).toBe(true);
  });

  it("returns true when dateRange.end present", () => {
    expect(
      isQuerySpecActive(new URLSearchParams("dateRange.end=2024-12-31")),
    ).toBe(true);
  });

  it("returns true for multiple active filters", () => {
    expect(
      isQuerySpecActive(
        new URLSearchParams(
          "tags=hiking&userIds=robbearman&lat=37.3861&lng=-122.0839",
        ),
      ),
    ).toBe(true);
  });

  it("returns false when only allTags is set (not a meaningful filter alone)", () => {
    expect(isQuerySpecActive(new URLSearchParams("allTags=true"))).toBe(false);
  });
});
