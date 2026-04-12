import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Atlasphere",
    short_name: "Atlasphere",
    description:
      "Discover and share stories tied to places. Every location on Earth has a story worth telling.",
    start_url: "/",
    display: "standalone",
    background_color: "#0094dd",
    theme_color: "#0094dd",
    icons: [
      {
        src: "/images/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/images/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
