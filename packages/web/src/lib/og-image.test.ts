import { describe, it, expect } from "vitest";

/**
 * Mirrors the og:image resolution logic used in generateMetadata.
 * Extracted here as a pure function so we can unit-test it without
 * spinning up Next.js.
 */
function resolveOgImage(
  snippetImage: string | undefined,
  r2BaseUrl: string,
  baseUrl: string,
): string {
  if (snippetImage) {
    if (snippetImage.startsWith("http")) {
      return snippetImage; // legacy S3 — use as-is
    }
    return `${r2BaseUrl}/${snippetImage}`; // R2 path — prepend base
  }
  return `${baseUrl}/images/atlasphere-green-on-blue.svg`; // fallback
}

describe("resolveOgImage", () => {
  const R2 = "https://pub-abc.r2.dev";
  const BASE = "https://atlasphere.app";

  it("returns S3 URL as-is for legacy markers", () => {
    const s3Url =
      "https://s3.amazonaws.com/atlasphere/accounts/rob/1.jpg";
    expect(resolveOgImage(s3Url, R2, BASE)).toBe(s3Url);
  });

  it("returns https R2 CDN URL as-is", () => {
    const cdnUrl = "https://pub-abc.r2.dev/accounts/rob/images/123/1.jpg";
    expect(resolveOgImage(cdnUrl, R2, BASE)).toBe(cdnUrl);
  });

  it("prepends R2 base for bare R2 paths", () => {
    const r2Path = "accounts/rob/images/1700000000000/1.jpg";
    expect(resolveOgImage(r2Path, R2, BASE)).toBe(`${R2}/${r2Path}`);
  });

  it("falls back to the Atlasphere logo when snippetImage is empty", () => {
    expect(resolveOgImage("", R2, BASE)).toBe(
      `${BASE}/images/atlasphere-green-on-blue.svg`,
    );
  });

  it("falls back to the Atlasphere logo when snippetImage is undefined", () => {
    expect(resolveOgImage(undefined, R2, BASE)).toBe(
      `${BASE}/images/atlasphere-green-on-blue.svg`,
    );
  });
});
