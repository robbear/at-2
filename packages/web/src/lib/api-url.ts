/**
 * Returns the API base URL, ensuring it has a protocol prefix.
 * Railway exports API_URL without a protocol (e.g. "at-2api.up.railway.app"),
 * so we prepend "https://" when no protocol is present.
 */
export function getApiUrl(): string {
  const raw = process.env["API_URL"] ?? "http://localhost:3001";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}
