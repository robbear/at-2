import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

  it("logo links to home", () => {
    render(<Header />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/");
  });
});
