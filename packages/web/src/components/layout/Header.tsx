"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import { MenuDrawer } from "./MenuDrawer";

export function Header(): ReactElement {
  const [menuOpen, setMenuOpen] = useState(false);

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
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="text-slate-700 p-2 hover:bg-slate-100 rounded-md transition-colors"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      </header>
      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
