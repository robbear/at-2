import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Header } from "./Header";

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
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// Mock MenuDrawer so we don't need to mock all its dependencies
vi.mock("./MenuDrawer", () => ({
  MenuDrawer: () => <div data-testid="menu-drawer" />,
}));

// Mock next-auth/react so useSession doesn't require SessionProvider
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

import React from "react";

describe("Header", () => {
  it("renders the Atlasphere logo", () => {
    render(<Header />);
    const logo = screen.getByAltText("Atlasphere");
    expect(logo).toBeInTheDocument();
  });

  it("renders the menu button", () => {
    render(<Header />);
    const menuBtn = screen.getByRole("button", { name: /open menu/i });
    expect(menuBtn).toBeInTheDocument();
  });

  it("renders the search toggle button", () => {
    render(<Header />);
    const searchBtn = screen.getByRole("button", { name: /toggle search/i });
    expect(searchBtn).toBeInTheDocument();
  });

  it("renders the share button", () => {
    render(<Header />);
    const shareBtn = screen.getByRole("button", { name: /copy link/i });
    expect(shareBtn).toBeInTheDocument();
  });

  it("logo links to home", () => {
    render(<Header />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/");
  });

  it("calls onSearchToggle when search button is clicked", () => {
    const onSearchToggle = vi.fn();
    render(<Header onSearchToggle={onSearchToggle} />);
    fireEvent.click(screen.getByRole("button", { name: /toggle search/i }));
    expect(onSearchToggle).toHaveBeenCalledOnce();
  });

  it("shows active indicator dot when searchActive is true", () => {
    render(<Header searchActive={true} />);
    // The dot span is aria-hidden, but we can check it's in the DOM
    const searchBtn = screen.getByRole("button", { name: /toggle search/i });
    const dot = searchBtn.querySelector('span[aria-hidden="true"]');
    expect(dot).toBeInTheDocument();
  });

  it("does not show active indicator dot when searchActive is false", () => {
    render(<Header searchActive={false} />);
    const searchBtn = screen.getByRole("button", { name: /toggle search/i });
    const dot = searchBtn.querySelector('span[aria-hidden="true"]');
    expect(dot).not.toBeInTheDocument();
  });

  it("calls navigator.clipboard.writeText on share click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
    });

    render(<Header />);
    fireEvent.click(screen.getByRole("button", { name: /copy link/i }));
    expect(writeText).toHaveBeenCalledWith(window.location.href);
  });
});
