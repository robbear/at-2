/**
 * Returns true when any non-default QuerySpec filter is present in the
 * given URLSearchParams. Used to show the active indicator on the search icon.
 */
export function isQuerySpecActive(searchParams: URLSearchParams): boolean {
  return (
    searchParams.has("tags") ||
    searchParams.has("userIds") ||
    searchParams.has("near.lat") ||
    searchParams.has("dateRange.start") ||
    searchParams.has("dateRange.end")
  );
}
