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

  it("renders Search, Clear, and Cancel buttons when open", () => {
    render(<SearchPanel open={true} onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: /^search$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^clear$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^cancel$/i })).toBeInTheDocument();
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

  // iOS Safari auto-zooms on input focus when font-size < 16px. All text and
  // date inputs must use text-base (16px) or larger to prevent viewport zoom.
  it("text inputs use text-base to prevent iOS auto-zoom on focus", () => {
    render(<SearchPanel open={true} onClose={vi.fn()} />);
    const textInputs = screen.getAllByRole("textbox");
    for (const input of textInputs) {
      expect(input.className, `input "${input.getAttribute("placeholder")}" must not use text-sm`)
        .not.toMatch(/\btext-sm\b/);
      expect(input.className, `input "${input.getAttribute("placeholder")}" must use text-base`)
        .toMatch(/\btext-base\b/);
    }
  });

  it("date inputs use text-base to prevent iOS auto-zoom on focus", () => {
    const { container } = render(<SearchPanel open={true} onClose={vi.fn()} />);
    const dateInputs = container.querySelectorAll<HTMLInputElement>('input[type="date"]');
    expect(dateInputs.length).toBeGreaterThan(0);
    for (const input of dateInputs) {
      expect(input.className, "date input must not use text-sm").not.toMatch(/\btext-sm\b/);
      expect(input.className, "date input must use text-base").toMatch(/\btext-base\b/);
    }
  });
});
