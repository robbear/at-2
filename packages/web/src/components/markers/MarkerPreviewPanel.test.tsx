import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkerPreviewPanel } from "./MarkerPreviewPanel";
import type { Marker } from "@at-2/shared";
import React from "react";

// Mock next/image
vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
    ...props
  }: {
    alt: string;
    src: string;
    [key: string]: unknown;
  }) => <img alt={alt} src={src} {...props} />,
}));

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
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock next/navigation hooks
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}));

const MOCK_MARKER: Marker = {
  id: "testuser/1234567890",
  userId: "testuser",
  title: "Test Marker Title",
  snippetText: "A short description of this location.",
  snippetImage: "",
  contentUrl: "",
  markdown: "# Test\n\nContent here.",
  tags: [],
  images: [],
  location: { type: "Point", coordinates: [-122.4194, 37.7749] },
  datetime: new Date("2024-01-15"),
  posttime: new Date("2024-01-16"),
  draft: false,
  archived: false,
  deleted: false,
};

describe("MarkerPreviewPanel", () => {
  it("renders the marker title", () => {
    render(<MarkerPreviewPanel marker={MOCK_MARKER} />);
    expect(screen.getByText("Test Marker Title")).toBeInTheDocument();
  });

  it('renders the "Full view" button linking to the detail page', () => {
    render(<MarkerPreviewPanel marker={MOCK_MARKER} />);
    const fullViewLink = screen.getByRole("link", { name: /full view/i });
    expect(fullViewLink).toBeInTheDocument();
    expect(fullViewLink.getAttribute("href")).toMatch(
      /^\/testuser\/1234567890\/detail/,
    );
  });

  it("renders the snippet text", () => {
    render(<MarkerPreviewPanel marker={MOCK_MARKER} />);
    expect(
      screen.getByText("A short description of this location."),
    ).toBeInTheDocument();
  });

  it("renders attribution with userId", () => {
    render(<MarkerPreviewPanel marker={MOCK_MARKER} />);
    expect(screen.getByText("testuser")).toBeInTheDocument();
  });

  it("renders a close button", () => {
    render(<MarkerPreviewPanel marker={MOCK_MARKER} />);
    expect(
      screen.getByRole("button", { name: /close preview/i }),
    ).toBeInTheDocument();
  });
});
