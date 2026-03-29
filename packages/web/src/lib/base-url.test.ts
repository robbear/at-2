import { describe, it, expect, afterEach } from "vitest";
import { getBaseUrl } from "./base-url";

describe("getBaseUrl", () => {
  afterEach(() => {
    delete process.env["NEXT_PUBLIC_SITE_URL"];
    delete process.env["VERCEL_URL"];
  });

  it("returns NEXT_PUBLIC_SITE_URL when set", () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://atlasphere.app";
    expect(getBaseUrl()).toBe("https://atlasphere.app");
  });

  it("returns https:// + VERCEL_URL when NEXT_PUBLIC_SITE_URL is not set", () => {
    process.env["VERCEL_URL"] = "at-2-abc123.vercel.app";
    expect(getBaseUrl()).toBe("https://at-2-abc123.vercel.app");
  });

  it("NEXT_PUBLIC_SITE_URL takes priority over VERCEL_URL", () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://atlasphere.app";
    process.env["VERCEL_URL"] = "at-2-abc123.vercel.app";
    expect(getBaseUrl()).toBe("https://atlasphere.app");
  });

  it("returns http://localhost:3000 when neither env var is set", () => {
    expect(getBaseUrl()).toBe("http://localhost:3000");
  });
});
