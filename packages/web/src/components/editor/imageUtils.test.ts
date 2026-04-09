import { describe, it, expect } from "vitest";
import {
  assignNames,
  computeNewCoverAfterRemoval,
  resolveSnippetImageForSave,
} from "./imageUtils";
import type { LocalImage } from "./ImageGrid";

function makeImage(name: string, index: number): LocalImage {
  return {
    name,
    r2Path: `path/${name}`,
    previewUrl: `blob:${name}`,
    file: new File([], name),
  };
}

function makeImages(count: number): LocalImage[] {
  return Array.from({ length: count }, (_, i) =>
    makeImage(`${i + 1}.jpg`, i),
  );
}

describe("assignNames", () => {
  it("assigns sequential names starting at 1", () => {
    const imgs = makeImages(3);
    const result = assignNames(imgs);
    expect(result.map((i) => i.name)).toEqual(["1.jpg", "2.jpg", "3.jpg"]);
  });

  it("re-sequences names after a removal gap", () => {
    // Simulate [1.jpg, 2.jpg, 3.jpg] with middle removed
    const imgs = [makeImage("1.jpg", 0), makeImage("3.jpg", 2)];
    const result = assignNames(imgs);
    expect(result.map((i) => i.name)).toEqual(["1.jpg", "2.jpg"]);
  });

  it("returns empty array unchanged", () => {
    expect(assignNames([])).toEqual([]);
  });
});

describe("computeNewCoverAfterRemoval", () => {
  it("shifts cover to 1.jpg when the current cover is removed", () => {
    const imgs = makeImages(3);
    // Cover is the first image (1.jpg)
    const newCover = computeNewCoverAfterRemoval(imgs, "1.jpg", 0);
    expect(newCover).toBe("1.jpg"); // was "2.jpg", now renumbered to "1.jpg"
  });

  it("shifts cover name when a preceding image is removed", () => {
    const imgs = makeImages(3);
    // Cover is 3.jpg (index 2); remove 1.jpg (index 0)
    // Cover shifts from position 2 to position 1 → becomes "2.jpg"
    const newCover = computeNewCoverAfterRemoval(imgs, "3.jpg", 0);
    expect(newCover).toBe("2.jpg");
  });

  it("does not change cover name when a following image is removed", () => {
    const imgs = makeImages(3);
    // Cover is 1.jpg; remove 3.jpg (index 2)
    const newCover = computeNewCoverAfterRemoval(imgs, "1.jpg", 2);
    expect(newCover).toBe("1.jpg");
  });

  it("returns empty string when all images are removed", () => {
    const imgs = makeImages(1);
    const newCover = computeNewCoverAfterRemoval(imgs, "1.jpg", 0);
    expect(newCover).toBe("");
  });

  it("removes middle image and shifts cover accordingly", () => {
    const imgs = makeImages(4); // 1.jpg, 2.jpg, 3.jpg, 4.jpg
    // Cover is 4.jpg (index 3); remove 2.jpg (index 1)
    // After removal: [1.jpg, 3.jpg, 4.jpg] → renamed [1.jpg, 2.jpg, 3.jpg]
    // Old cover was at position 3, after removing index 1 it moves to position 2 → "3.jpg"
    const newCover = computeNewCoverAfterRemoval(imgs, "4.jpg", 1);
    expect(newCover).toBe("3.jpg");
  });

  it("selects a new first image as cover when cover at index 0 is removed from multi-image array", () => {
    const imgs = makeImages(3); // 1.jpg, 2.jpg, 3.jpg
    // Cover is 1.jpg; remove it
    const newCover = computeNewCoverAfterRemoval(imgs, "1.jpg", 0);
    expect(newCover).toBe("1.jpg"); // previously "2.jpg", renumbered to "1.jpg"
  });
});

describe("resolveSnippetImageForSave", () => {
  it("uses the selected cover image r2Path when available", () => {
    const images = makeImages(2);
    expect(resolveSnippetImageForSave(images, "2.jpg", "https://legacy.example/2.jpg")).toBe(
      "path/2.jpg",
    );
  });

  it("preserves a legacy fully qualified snippetImage when no replacement exists", () => {
    expect(
      resolveSnippetImageForSave([], "1.jpg", "https://s3.amazonaws.com/bucket/legacy.jpg"),
    ).toBe("https://s3.amazonaws.com/bucket/legacy.jpg");
  });

  it("clears snippetImage when there is no cover image and no legacy URL to preserve", () => {
    expect(resolveSnippetImageForSave([], "", "accounts/alice/images/1.jpg")).toBe("");
  });
});
