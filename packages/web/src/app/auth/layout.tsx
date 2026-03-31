import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <div className="min-h-screen bg-surface-muted flex flex-col">
      {/* Brand header */}
      <div className="bg-brand-blue py-4 px-6 flex justify-center">
        <Link href="/">
          <Image
            src="/images/atlasphere-green-blue-page-logo.svg"
            alt="Atlasphere"
            width={160}
            height={40}
            priority
          />
        </Link>
      </div>

      {/* Page content */}
      <div className="flex-1 flex items-start justify-center py-12 px-4">
        <div className="w-full max-w-sm bg-surface rounded-lg border border-slate-200 shadow-sm p-6">
          {children}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400">
        <Link href="/" className="hover:text-brand-blue transition-colors">
          ← Back to map
        </Link>
      </footer>
    </div>
  );
}
