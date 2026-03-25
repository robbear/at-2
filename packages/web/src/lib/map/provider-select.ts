export function selectProvider(
  override: string | undefined,
  urlParam: string | null,
): "google" | "mapbox" {
  if (override === "google") return "google";
  if (override === "mapbox") return "mapbox";
  if (urlParam === "0") return "google";
  if (urlParam === "1") return "mapbox";
  return "mapbox"; // default
}
