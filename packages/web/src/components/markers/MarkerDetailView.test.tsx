import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import {
  buildPreservedParams,
  extractMarkerId,
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
// extractMarkerId
// ---------------------------------------------------------------------------

describe("extractMarkerId", () => {
  it("strips leading slash", () => {
    expect(extractMarkerId("/alice/12345678901234567")).toBe(
      "alice/12345678901234567",
    );
  });

  it("strips /detail suffix", () => {
    expect(extractMarkerId("/alice/12345678901234567/detail")).toBe(
      "alice/12345678901234567",
    );
  });

  it("handles legacy short timestamps", () => {
    expect(extractMarkerId("/robbearman/1708900000000")).toBe(
      "robbearman/1708900000000",
    );
  });
});

// ---------------------------------------------------------------------------
// buildPreservedParams
// ---------------------------------------------------------------------------

describe("buildPreservedParams", () => {
  it("returns '?' string with linkedMarkerId appended to markerIds", () => {
    const result = buildPreservedParams("", "alice/123");
    const params = new URLSearchParams(result.slice(1));
    expect(params.getAll("markerIds")).toContain("alice/123");
  });

  it("preserves existing params alongside the new markerId", () => {
    const result = buildPreservedParams(
      "lat=37.5&lng=-122.1&zoom=10",
      "alice/123",
    );
    const params = new URLSearchParams(result.slice(1));
    expect(params.get("lat")).toBe("37.5");
    expect(params.get("lng")).toBe("-122.1");
    expect(params.get("zoom")).toBe("10");
    expect(params.getAll("markerIds")).toContain("alice/123");
  });

  it("does not duplicate linkedMarkerId when already in markerIds", () => {
    const input = new URLSearchParams();
    input.append("markerIds", "alice/123");
    const result = buildPreservedParams(input.toString(), "alice/123");
    const params = new URLSearchParams(result.slice(1));
    expect(params.getAll("markerIds")).toEqual(["alice/123"]);
  });

  it("appends linkedMarkerId when markerIds has other entries", () => {
    const input = new URLSearchParams();
    input.append("markerIds", "bob/456");
    const result = buildPreservedParams(input.toString(), "alice/123");
    const params = new URLSearchParams(result.slice(1));
    expect(params.getAll("markerIds")).toEqual(["bob/456", "alice/123"]);
  });

  it("preserves array params (multiple tags, userIds)", () => {
    const input = new URLSearchParams();
    input.append("tags", "nature");
    input.append("tags", "history");
    input.append("userIds", "alice");
    input.append("userIds", "bob");
    const result = buildPreservedParams(input.toString(), "alice/123");
    const params = new URLSearchParams(result.slice(1));
    expect(params.getAll("tags")).toEqual(["nature", "history"]);
    expect(params.getAll("userIds")).toEqual(["alice", "bob"]);
  });

  it("starts with '?' when params are present", () => {
    const result = buildPreservedParams("lat=10", "alice/123");
    expect(result).toMatch(/^\?/);
  });

  it("starts with '?' even when searchString is empty (markerId is always added)", () => {
    const result = buildPreservedParams("", "alice/123");
    expect(result).toMatch(/^\?/);
  });
});

// ---------------------------------------------------------------------------
// makeAnchorComponent — anchor component returned by makeAnchorComponent
// ---------------------------------------------------------------------------

describe("makeAnchorComponent", () => {
  it("renders an internal marker link as a Next.js Link with preserved params and markerId", () => {
    const AnchorComponent = makeAnchorComponent(
      "lat=37.5&lng=-122.1&zoom=10",
    );
    render(
      <AnchorComponent href="/robbearman/20260101120000000">
        Next stop
      </AnchorComponent>,
    );
    const link = screen.getByRole("link", { name: "Next stop" });
    const href = link.getAttribute("href")!;
    expect(href).toContain("/robbearman/20260101120000000");
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("lat")).toBe("37.5");
    expect(params.get("lng")).toBe("-122.1");
    expect(params.getAll("markerIds")).toContain("robbearman/20260101120000000");
    expect(link.getAttribute("data-nextlink")).toBe("true");
    expect(link.getAttribute("target")).toBeNull();
  });

  it("strips /detail suffix from internal marker links", () => {
    const AnchorComponent = makeAnchorComponent("zoom=5");
    render(
      <AnchorComponent href="/alice/12345678901234567/detail">
        See detail
      </AnchorComponent>,
    );
    const link = screen.getByRole("link", { name: "See detail" });
    const href = link.getAttribute("href")!;
    expect(href).toContain("/alice/12345678901234567");
    expect(href).not.toContain("/detail");
  });

  it("treats legacy short-timestamp paths as internal links", () => {
    const AnchorComponent = makeAnchorComponent("");
    render(
      <AnchorComponent href="/robbearman/1708900000000">Legacy</AnchorComponent>,
    );
    const link = screen.getByRole("link", { name: "Legacy" });
    expect(link.getAttribute("data-nextlink")).toBe("true");
    const params = new URLSearchParams(link.getAttribute("href")!.split("?")[1]);
    expect(params.getAll("markerIds")).toContain("robbearman/1708900000000");
  });

  it("does not duplicate markerId when already in markerIds", () => {
    const input = new URLSearchParams();
    input.append("markerIds", "alice/12345678901234567");
    const AnchorComponent = makeAnchorComponent(input.toString());
    render(
      <AnchorComponent href="/alice/12345678901234567">Link</AnchorComponent>,
    );
    const href = screen.getByRole("link", { name: "Link" }).getAttribute("href")!;
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.getAll("markerIds")).toEqual(["alice/12345678901234567"]);
  });

  it("renders external links with target=_blank and rel=noopener noreferrer", () => {
    const AnchorComponent = makeAnchorComponent("lat=10");
    render(
      <AnchorComponent href="https://example.com">External</AnchorComponent>,
    );
    const link = screen.getByRole("link", { name: "External" });
    expect(link.getAttribute("href")).toBe("https://example.com");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link.getAttribute("data-nextlink")).toBeNull();
  });

  it("renders http links with target=_blank", () => {
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

  it("treats single-segment internal paths as external (not marker links)", () => {
    const AnchorComponent = makeAnchorComponent("lat=10");
    render(
      <AnchorComponent href="/about">About</AnchorComponent>,
    );
    // /about has only one segment — not a marker link
    const link = screen.getByRole("link", { name: "About" });
    expect(link.getAttribute("data-nextlink")).toBeNull();
    expect(link.getAttribute("target")).toBe("_blank");
  });
});
