import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BaseMarker } from "./BaseMarker";
import React from "react";

// Helper: the pin path element (has a fill that isn't "white")
function pinPath(container: HTMLElement): SVGPathElement | null {
  return container.querySelector<SVGPathElement>("path");
}

describe("BaseMarker", () => {
  it("defaults to brand blue fill when no color prop is passed", () => {
    const { container } = render(<BaseMarker />);
    expect(pinPath(container)?.getAttribute("fill")).toBe("#0094dd");
  });

  it("uses the provided color as fill when unselected", () => {
    const { container } = render(<BaseMarker color="#ff0000" />);
    expect(pinPath(container)?.getAttribute("fill")).toBe("#ff0000");
  });

  it("defaults to white outline stroke when no outline prop is passed", () => {
    const { container } = render(<BaseMarker />);
    expect(pinPath(container)?.getAttribute("stroke")).toBe("#ffffff");
  });

  it("uses the provided outline as stroke when unselected", () => {
    const { container } = render(<BaseMarker outline="#aabbcc" />);
    expect(pinPath(container)?.getAttribute("stroke")).toBe("#aabbcc");
  });

  it("uses brand green fill when selected, ignoring custom color", () => {
    const { container } = render(<BaseMarker color="#ff0000" selected />);
    expect(pinPath(container)?.getAttribute("fill")).toBe("#93c572");
  });

  it("uses white outline when selected, ignoring custom outline", () => {
    const { container } = render(<BaseMarker outline="#aabbcc" selected />);
    expect(pinPath(container)?.getAttribute("stroke")).toBe("#ffffff");
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
    expect(
      container.querySelector<SVGCircleElement>("circle")?.getAttribute("fill"),
    ).toBe("white");
  });

  it("size prop scales the SVG", () => {
    const { container: x1 } = render(<BaseMarker size={1} />);
    const { container: x2 } = render(<BaseMarker size={2} />);
    const w1 = Number(x1.querySelector("svg")?.getAttribute("width"));
    const w2 = Number(x2.querySelector("svg")?.getAttribute("width"));
    expect(w2).toBe(w1 * 2);
  });

  it("size={1.25} without selected gives same width as selected with size=1", () => {
    const { container: sizedC } = render(<BaseMarker size={1.25} />);
    const { container: selectedC } = render(<BaseMarker selected />);
    expect(sizedC.querySelector("svg")?.getAttribute("width")).toBe(
      selectedC.querySelector("svg")?.getAttribute("width"),
    );
  });
});
