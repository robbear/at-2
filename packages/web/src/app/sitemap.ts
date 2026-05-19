import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/base-url";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: getBaseUrl(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
