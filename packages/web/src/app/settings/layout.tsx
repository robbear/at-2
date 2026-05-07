import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="min-h-screen bg-surface-muted flex flex-col">
      <header className="h-[52px] md:h-[60px] bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
        <Link href="/">
          <Image
            src="/images/atlasphere-green-blue-page-logo.svg"
            alt="Atlasphere"
            width={160}
            height={40}
            priority
          />
        </Link>
        <Link
          href="/"
          className="text-sm text-slate-500 hover:text-brand-blue transition-colors"
        >
          ← Back to map
        </Link>
      </header>
      <main className="flex-1 py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-8">{children}</div>
      </main>
    </div>
  );
}
