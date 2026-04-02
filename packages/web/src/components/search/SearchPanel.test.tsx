import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SearchPanel } from "./SearchPanel";
import React from "react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn() }),
}));

describe("SearchPanel", () => {
  it("is aria-hidden when closed", () => {
    render(<SearchPanel open={false} onClose={vi.fn()} />);
    // Panel is present in DOM but pointer-events-none / aria-hidden
    const panel = screen.getByTestId("search-panel");
    expect(panel).toHaveAttribute("aria-hidden", "true");
  });

  it("renders all four sections when open", () => {
    render(<SearchPanel open={true} onClose={vi.fn()} />);
    expect(screen.getByText("Tags")).toBeInTheDocument();
    expect(screen.getByText("Authors")).toBeInTheDocument();
    expect(screen.getByText("Location radius")).toBeInTheDocument();
    expect(screen.getByText("Date range")).toBeInTheDocument();
  });

  it("renders Search and Clear all buttons when open", () => {
    render(<SearchPanel open={true} onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: /^search$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear all/i })).toBeInTheDocument();
  });

  it("renders date preset buttons when open", () => {
    render(<SearchPanel open={true} onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: /last 7 days/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /last 30 days/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /last year/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /all time/i })).toBeInTheDocument();
  });

  it("renders tag and author add inputs when open", () => {
    render(<SearchPanel open={true} onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText(/add a tag/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/add a username/i)).toBeInTheDocument();
  });
});
