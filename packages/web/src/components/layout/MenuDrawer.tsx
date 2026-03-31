"use client";

import type { ReactElement } from "react";
import { X } from "lucide-react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface MenuDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MenuDrawer({ open, onClose }: MenuDrawerProps): ReactElement {
  const { data: session } = useSession();

  function handleSignOut(): void {
    void signOut({ callbackUrl: "/" });
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/40 z-50 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-72 bg-surface z-50 shadow-xl",
          "transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <span className="font-semibold text-slate-800">Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-md transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="p-4 flex flex-col gap-1">
          {session ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="text-left w-full px-3 py-2 rounded-md hover:bg-slate-100 text-slate-700 transition-colors"
            >
              Sign out
            </button>
          ) : (
            <>
              <Link
                href="/auth/signin"
                onClick={onClose}
                className="block px-3 py-2 rounded-md hover:bg-slate-100 text-slate-700 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/auth/register"
                onClick={onClose}
                className="block px-3 py-2 rounded-md hover:bg-slate-100 text-slate-700 transition-colors"
              >
                Register
              </Link>
            </>
          )}

          <hr className="my-2 border-slate-200" />

          <button
            type="button"
            disabled
            className="text-left w-full px-3 py-2 rounded-md text-slate-400 cursor-not-allowed"
          >
            Satellite view (coming soon)
          </button>

          <Link
            href="/about"
            onClick={onClose}
            className="block px-3 py-2 rounded-md hover:bg-slate-100 text-slate-700 transition-colors"
          >
            About
          </Link>
        </nav>
      </div>
    </>
  );
}
