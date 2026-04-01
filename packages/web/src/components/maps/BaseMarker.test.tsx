import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BaseMarker } from "./BaseMarker";
import React from "react";

describe("BaseMarker", () => {
  it("defaults to brand blue (#0094dd) when no color prop is passed", () => {
    const { container } = render(<BaseMarker />);
    // Body path is the one with a non-none fill
    const bodyPath = container.querySelector<SVGPathElement>("path:not([fill='none'])");
    expect(bodyPath?.getAttribute("fill")).toBe("#0094dd");
  });

  it("uses the provided color as fill", () => {
    const { container } = render(<BaseMarker color="#ff0000" />);
    const bodyPath = container.querySelector<SVGPathElement>("path:not([fill='none'])");
    expect(bodyPath?.getAttribute("fill")).toBe("#ff0000");
  });

  it("does not render a white ring path when not selected", () => {
    const { container } = render(<BaseMarker />);
    const whitePath = container.querySelector("path[stroke='white']");
    expect(whitePath).toBeNull();
  });

  it("renders an extra white-stroke ring path when selected", () => {
    const { container } = render(<BaseMarker selected />);
    const whitePath = container.querySelector("path[stroke='white']");
    expect(whitePath).not.toBeNull();
  });

  it("renders larger when selected", () => {
    const { container: defaultC } = render(<BaseMarker selected={false} />);
    const { container: selectedC } = render(<BaseMarker selected />);
    const defaultW = Number(defaultC.querySelector("svg")?.getAttribute("width"));
    const selectedW = Number(selectedC.querySelector("svg")?.getAttribute("width"));
    expect(selectedW).toBeGreaterThan(defaultW);
  });

  it("renders an inner white circle dot", () => {
    const { container } = render(<BaseMarker />);
    const dot = container.querySelector<SVGCircleElement>("circle");
    expect(dot?.getAttribute("fill")).toBe("white");
  });
});
