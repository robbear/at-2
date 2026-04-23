import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkerPreviewPanel } from "./MarkerPreviewPanel";
import type { Marker } from "@at-2/shared";
import React from "react";

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

// Mock next-auth — tests don't need a real SessionProvider
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
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
      /^\/testuser\/1234567890\/details/,
    );
  });

  it("renders body content passed as children", () => {
    render(
      <MarkerPreviewPanel marker={MOCK_MARKER}>
        <p>Rendered MDX body content</p>
      </MarkerPreviewPanel>,
    );
    expect(screen.getByText("Rendered MDX body content")).toBeInTheDocument();
  });

  it("renders attribution with userId in the header", () => {
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
