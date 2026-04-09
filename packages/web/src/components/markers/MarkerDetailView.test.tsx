import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import {
  buildPreservedParams,
  makeAnchorComponent,
} from "./MarkerDetailView";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} data-nextlink="true" {...props}>
      {children}
    </a>
  ),
}));

// ---------------------------------------------------------------------------
// buildPreservedParams
// ---------------------------------------------------------------------------

describe("buildPreservedParams", () => {
  it("returns empty string when searchString is undefined", () => {
    expect(buildPreservedParams(undefined)).toBe("");
  });

  it("returns empty string when searchString is empty", () => {
    expect(buildPreservedParams("")).toBe("");
  });

  it("preserves viewport params", () => {
    const result = buildPreservedParams("lat=37.5&lng=-122.1&zoom=10.50");
    const params = new URLSearchParams(result.slice(1)); // remove leading '?'
    expect(params.get("lat")).toBe("37.5");
    expect(params.get("lng")).toBe("-122.1");
    expect(params.get("zoom")).toBe("10.50");
  });

  it("preserves map provider param", () => {
    const result = buildPreservedParams("mp=1");
    const params = new URLSearchParams(result.slice(1));
    expect(params.get("mp")).toBe("1");
  });

  it("preserves QuerySpec params", () => {
    const result = buildPreservedParams(
      "tags=nature&userIds=alice&allTags=true",
    );
    const params = new URLSearchParams(result.slice(1));
    expect(params.get("tags")).toBe("nature");
    expect(params.get("userIds")).toBe("alice");
    expect(params.get("allTags")).toBe("true");
  });

  it("preserves array params (multiple values for same key)", () => {
    const input = new URLSearchParams();
    input.append("tags", "nature");
    input.append("tags", "history");
    input.append("userIds", "alice");
    input.append("userIds", "bob");
    const result = buildPreservedParams(input.toString());
    const params = new URLSearchParams(result.slice(1));
    expect(params.getAll("tags")).toEqual(["nature", "history"]);
    expect(params.getAll("userIds")).toEqual(["alice", "bob"]);
  });

  it("excludes unrecognised params", () => {
    const result = buildPreservedParams("unknown=foo&lat=10&bogus=bar");
    const params = new URLSearchParams(result.slice(1));
    expect(params.has("unknown")).toBe(false);
    expect(params.has("bogus")).toBe(false);
    expect(params.get("lat")).toBe("10");
  });

  it("preserves all QuerySpec date range params", () => {
    const input = "dateRange.start=2024-01-01&dateRange.end=2024-12-31&dateRange.usePosttime=true";
    const result = buildPreservedParams(input);
    const params = new URLSearchParams(result.slice(1));
    expect(params.get("dateRange.start")).toBe("2024-01-01");
    expect(params.get("dateRange.end")).toBe("2024-12-31");
    expect(params.get("dateRange.usePosttime")).toBe("true");
  });

  it("returns empty string when no recognised params are present", () => {
    const result = buildPreservedParams("foo=bar&baz=qux");
    expect(result).toBe("");
  });

  it("starts with '?' when params are present", () => {
    const result = buildPreservedParams("lat=10&lng=20");
    expect(result).toMatch(/^\?/);
  });
});

// ---------------------------------------------------------------------------
// makeAnchorComponent — anchor component returned by makeAnchorComponent
// ---------------------------------------------------------------------------

describe("makeAnchorComponent", () => {
  it("renders an internal marker link as a Next.js Link with preserved params", () => {
    const AnchorComponent = makeAnchorComponent("?lat=37.5&lng=-122.1&zoom=10");
    render(
      <AnchorComponent href="/robbearman/20260101120000000">
        Next stop
      </AnchorComponent>,
    );
    const link = screen.getByRole("link", { name: "Next stop" });
    expect(link.getAttribute("href")).toBe(
      "/robbearman/20260101120000000?lat=37.5&lng=-122.1&zoom=10",
    );
    expect(link.getAttribute("data-nextlink")).toBe("true");
    expect(link.getAttribute("target")).toBeNull();
  });

  it("strips /detail suffix from internal marker links", () => {
    const AnchorComponent = makeAnchorComponent("?zoom=5");
    render(
      <AnchorComponent href="/alice/12345678901234567/detail">
        See detail
      </AnchorComponent>,
    );
    const link = screen.getByRole("link", { name: "See detail" });
    expect(link.getAttribute("href")).toBe(
      "/alice/12345678901234567?zoom=5",
    );
  });

  it("renders internal marker link without params when preservedParams is empty", () => {
    const AnchorComponent = makeAnchorComponent("");
    render(
      <AnchorComponent href="/alice/12345678901234567">Link</AnchorComponent>,
    );
    const link = screen.getByRole("link", { name: "Link" });
    expect(link.getAttribute("href")).toBe("/alice/12345678901234567");
  });

  it("renders external links with target=_blank and rel=noopener noreferrer", () => {
    const AnchorComponent = makeAnchorComponent("?lat=10");
    render(
      <AnchorComponent href="https://example.com">External</AnchorComponent>,
    );
    const link = screen.getByRole("link", { name: "External" });
    expect(link.getAttribute("href")).toBe("https://example.com");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link.getAttribute("data-nextlink")).toBeNull();
  });

  it("renders external http links with target=_blank", () => {
    const AnchorComponent = makeAnchorComponent("");
    render(
      <AnchorComponent href="http://example.com">HTTP link</AnchorComponent>,
    );
    const link = screen.getByRole("link", { name: "HTTP link" });
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("renders without href gracefully", () => {
    const AnchorComponent = makeAnchorComponent("");
    render(<AnchorComponent>No href</AnchorComponent>);
    expect(screen.getByText("No href")).toBeInTheDocument();
  });

  it("does not treat non-marker internal paths as marker links", () => {
    const AnchorComponent = makeAnchorComponent("?lat=10");
    render(
      <AnchorComponent href="/about">About</AnchorComponent>,
    );
    // /about does not match the marker regex — should be treated as external
    const link = screen.getByRole("link", { name: "About" });
    expect(link.getAttribute("data-nextlink")).toBeNull();
  });
});
