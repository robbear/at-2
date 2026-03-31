import type { ReactElement } from "react";
import Link from "next/link";

export default function MarkerNotFound(): ReactElement {
  return (
    <div className="flex flex-col h-full items-center justify-center p-6 text-center gap-4">
      <h2 className="text-lg font-semibold text-slate-900">Marker not found</h2>
      <p className="text-sm text-slate-500">
        This marker may have been deleted or the link is incorrect.
      </p>
      <Link
        href="/"
        className="inline-block bg-brand-blue text-white py-2 px-5 rounded-md font-medium hover:bg-brand-blue/90 transition-colors"
      >
        Return to map
      </Link>
    </div>
  );
}
