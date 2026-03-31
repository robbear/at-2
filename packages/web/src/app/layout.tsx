import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { getBaseUrl } from "@/lib/base-url";

const SITE_DESCRIPTION =
  "Discover and share stories tied to places. Every location on Earth has a story worth telling.";

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: "Atlasphere",
    template: "%s | Atlasphere",
  },
  description: SITE_DESCRIPTION,
  icons: {
    icon: "/images/atlasphere-green-on-blue.svg",
    shortcut: "/images/atlasphere-green-on-blue.svg",
    apple: "/images/atlasphere-green-on-blue.svg",
  },
  openGraph: {
    type: "website",
    siteName: "Atlasphere",
    title: "Atlasphere",
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Atlasphere",
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
