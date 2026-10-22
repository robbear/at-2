import { afterEach, describe, expect, it } from "vitest";
import { middleware } from "./middleware";

describe("maintenance middleware", () => {
  afterEach(() => {
    delete process.env["MAINTENANCE_MODE"];
  });

  it("passes through when MAINTENANCE_MODE is unset", () => {
    expect(middleware()).toBeUndefined();
  });

  it("returns the vacation page with 503 when MAINTENANCE_MODE=true", async () => {
    process.env["MAINTENANCE_MODE"] = "true";
    const res = middleware();
    expect(res?.status).toBe(503);
    expect(res?.headers.get("Retry-After")).toBe("86400");
    expect(await res?.text()).toContain("on vacation");
  });
});
