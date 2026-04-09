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
  it("returns empty string for empty searchString", () => {
    expect(buildPreservedParams("")).toBe("");
  });

  it("returns '?' + searchString when params are present", () => {
    expect(buildPreservedParams("lat=37.5&lng=-122.1&zoom=10")).toBe(
      "?lat=37.5&lng=-122.1&zoom=10",
    );
  });

  it("preserves QuerySpec params", () => {
    const result = buildPreservedParams("userIds=nytimes&tags=politics");
    expect(result).toBe("?userIds=nytimes&tags=politics");
  });

  it("passes existing markerIds through unchanged", () => {
    const result = buildPreservedParams("markerIds=alice%2F123&userIds=alice");
    const params = new URLSearchParams(result.slice(1));
    expect(params.getAll("markerIds")).toEqual(["alice/123"]);
    expect(params.get("userIds")).toBe("alice");
  });

  it("does NOT append the linked marker ID", () => {
    // markerIds should only come from existing URL state, never injected here
    const result = buildPreservedParams("userIds=nytimes");
    const params = new URLSearchParams(result.slice(1));
    expect(params.getAll("markerIds")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// makeAnchorComponent
// ---------------------------------------------------------------------------

describe("makeAnchorComponent", () => {
  it("renders internal marker link as a Next.js Link preserving existing params", () => {
    const AnchorComponent = makeAnchorComponent("lat=37.5&lng=-122.1&zoom=10");
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
    // markerIds must NOT be injected server-side
    expect(params.getAll("markerIds")).toHaveLength(0);
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
  });

  it("passes existing markerIds through without adding new ones", () => {
    const AnchorComponent = makeAnchorComponent("userIds=nytimes");
    render(
      <AnchorComponent href="/alice/12345678901234567">Link</AnchorComponent>,
    );
    const href = screen.getByRole("link", { name: "Link" }).getAttribute("href")!;
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.getAll("markerIds")).toHaveLength(0);
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
    expect(
      screen.getByRole("link", { name: "HTTP link" }).getAttribute("target"),
    ).toBe("_blank");
  });

  it("renders without href gracefully", () => {
    const AnchorComponent = makeAnchorComponent("");
    render(<AnchorComponent>No href</AnchorComponent>);
    expect(screen.getByText("No href")).toBeInTheDocument();
  });

  it("treats single-segment internal paths as external (not marker links)", () => {
    const AnchorComponent = makeAnchorComponent("lat=10");
    render(<AnchorComponent href="/about">About</AnchorComponent>);
    const link = screen.getByRole("link", { name: "About" });
    expect(link.getAttribute("data-nextlink")).toBeNull();
    expect(link.getAttribute("target")).toBe("_blank");
  });
});
