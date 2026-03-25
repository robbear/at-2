import { describe, it, expect } from "vitest";
import { selectProvider } from "./provider-select";

describe("selectProvider", () => {
  it("returns google when override is 'google'", () => {
    expect(selectProvider("google", null)).toBe("google");
    expect(selectProvider("google", "1")).toBe("google");
    expect(selectProvider("google", "0")).toBe("google");
  });

  it("returns mapbox when override is 'mapbox'", () => {
    expect(selectProvider("mapbox", null)).toBe("mapbox");
    expect(selectProvider("mapbox", "0")).toBe("mapbox");
    expect(selectProvider("mapbox", "1")).toBe("mapbox");
  });

  it("override takes priority over urlParam", () => {
    expect(selectProvider("google", "1")).toBe("google");
    expect(selectProvider("mapbox", "0")).toBe("mapbox");
  });

  it("returns google when urlParam is '0' and no override", () => {
    expect(selectProvider(undefined, "0")).toBe("google");
  });

  it("returns mapbox when urlParam is '1' and no override", () => {
    expect(selectProvider(undefined, "1")).toBe("mapbox");
  });

  it("returns mapbox as default when no override and no urlParam", () => {
    expect(selectProvider(undefined, null)).toBe("mapbox");
  });

  it("returns mapbox as default for unrecognised urlParam", () => {
    expect(selectProvider(undefined, "2")).toBe("mapbox");
    expect(selectProvider(undefined, "")).toBe("mapbox");
  });
});
