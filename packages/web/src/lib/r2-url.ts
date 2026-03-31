/**
 * Resolves a stored image path to a renderable URL.
 *
 * Marker fields like `snippetImage` store raw R2 bucket keys
 * (e.g. `accounts/{userId}/images/{ts}/{file}`). To render them,
 * the R2 public base URL must be prepended.
 *
 * Handles three cases:
 *   1. Already an absolute URL (http/https) — returned as-is (legacy S3 or R2 CDN)
 *   2. Root-relative path (starts with /) — returned as-is
 *   3. Bare R2 key — prepended with NEXT_PUBLIC_R2_PUBLIC_URL if set; null if not
 */
export function resolveImageUrl(path: string | undefined | null): string | null {
  if (!path) return null;

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (path.startsWith("/")) {
    return path;
  }

  const r2Base = process.env["NEXT_PUBLIC_R2_PUBLIC_URL"];
  if (!r2Base) return null;

  return `${r2Base.replace(/\/$/, "")}/${path}`;
}
