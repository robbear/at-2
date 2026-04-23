import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DM_Sans, Lora } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { getBaseUrl } from "@/lib/base-url";
import { auth } from "@/auth";
import { Providers } from "@/components/providers";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

const SITE_DESCRIPTION =
  "Discover and share stories tied to places. Every location on Earth has a story worth telling.";

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: "Atlasphere",
    template: "%s | Atlasphere",
  },
  description: SITE_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/images/atlasphere-tab-icon.png",
    shortcut: "/images/atlasphere-tab-icon.png",
    apple: [{ url: "/images/apple-touch-icon.png", sizes: "180x180" }],
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

const gaId = process.env["NEXT_PUBLIC_GA_ID"];

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const session = await auth();
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${lora.variable} font-sans`}>
        <Providers session={session}>{children}</Providers>
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
