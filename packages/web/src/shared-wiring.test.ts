import { describe, it, expect } from "vitest";
import { MarkerSchema, QuerySpecSchema, ProfileSchema } from "@at-2/shared";

// This test exists to confirm that @at-2/shared is correctly wired into
// the web package. If the workspace dependency is broken, this import fails.
describe("@at-2/shared monorepo wiring", () => {
  it("MarkerSchema is importable and validates data", () => {
    const result = MarkerSchema.safeParse({
      id: "robbearman/1708900000000",
      userId: "robbearman",
      title: "Wiring test",
      snippetText: "snippet",
      snippetImage: "path/to/image.jpg",
      contentUrl: "path/to/content.mdx",
      markdown: "# Hello",
      tags: [],
      location: { type: "Point", coordinates: [-122.0839, 37.3861] },
      datetime: new Date(),
      posttime: new Date(),
      draft: false,
      archived: false,
      deleted: false,
    });
    expect(result.success).toBe(true);
  });

  it("QuerySpecSchema is importable and accepts empty spec", () => {
    const result = QuerySpecSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("ProfileSchema is importable and validates data", () => {
    const result = ProfileSchema.safeParse({
      _id: "user-123",
      userId: "robbearman",
      email: "rob@example.com",
      name: "Rob Bear",
      createdAt: new Date(),
    });
    expect(result.success).toBe(true);
  });
});
