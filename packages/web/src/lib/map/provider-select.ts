export function selectProvider(
  override: string | undefined,
  urlParam: string | null,
  defaultProvider: string | undefined = "google",
): "google" | "mapbox" {
  if (override === "google") return "google";
  if (override === "mapbox") return "mapbox";
  if (urlParam === "0") return "google";
  if (urlParam === "1") return "mapbox";
  if (defaultProvider === "mapbox") return "mapbox";
  return "google";
}
