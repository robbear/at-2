"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, SlidersHorizontal, Share2, Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { MenuDrawer } from "./MenuDrawer";

interface HeaderProps {
  onSearchToggle?: () => void;
  searchActive?: boolean;
}

export function Header({ onSearchToggle, searchActive = false }: HeaderProps): ReactElement {
  const [menuOpen, setMenuOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const { data: session } = useSession();

  function handleShare(): void {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 2000);
    });
  }

  return (
    <>
      <header className="h-[52px] md:h-[60px] bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-40">
        <Link href="/" className="flex items-center">
          <Image
            src="/images/atlasphere-green-blue-page-logo.svg"
            alt="Atlasphere"
            width={160}
            height={40}
            priority
          />
        </Link>
        <div className="flex items-center gap-1">
          {/* Search / filter toggle */}
          <button
            type="button"
            onClick={onSearchToggle}
            className="relative text-slate-700 p-2 hover:bg-slate-100 rounded-md transition-colors"
            aria-label="Toggle search filters"
          >
            <SlidersHorizontal size={22} />
            {searchActive && (
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-green"
                aria-hidden="true"
              />
            )}
          </button>

          {/* New marker — only when signed in */}
          {session && (
            <Link
              href="/markers/new"
              className="text-slate-700 p-2 hover:bg-slate-100 rounded-md transition-colors inline-flex items-center justify-center"
              aria-label="Create new marker"
            >
              <Plus size={22} />
            </Link>
          )}

          {/* Share — copies current URL */}
          <button
            type="button"
            onClick={handleShare}
            className="text-slate-700 p-2 hover:bg-slate-100 rounded-md transition-colors"
            aria-label="Copy link to clipboard"
          >
            <Share2 size={22} />
          </button>

          {/* Hamburger menu */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="text-slate-700 p-2 hover:bg-slate-100 rounded-md transition-colors"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </header>

      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Toast notification */}
      <div
        className={[
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
          "bg-slate-800 text-white text-sm px-4 py-2 rounded-md shadow-lg",
          "transition-opacity duration-300",
          toastVisible ? "opacity-100" : "opacity-0 pointer-events-none",
        ].join(" ")}
        role="status"
        aria-live="polite"
      >
        Link copied to clipboard!
      </div>
    </>
  );
}
