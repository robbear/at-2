# Milestone: Viewport-aware marker fetching

## Problem

The current architecture fetches all markers server-side at SSR time (`(map)/layout.tsx`)
and passes them as a static `initialMarkers` array to `MapShell`. The map never
re-fetches as the user pans or zooms.

This is acceptable while the `markers` collection stays small (< ~1000 records).
Beyond that scale, or once markers grow geographically dense, this will cause:
- Slow initial page loads (large SSR payload)
- No way to surface new markers without a full page reload
- Poor UX when zooming into dense areas (all markers always rendered)

## Desired behavior

The map client should fetch markers for the current bounding box (or a `near`
radius around the center), re-fetching on pan/zoom with appropriate debouncing.
The server-side fetch becomes an optional initial seed (e.g. markers near the
default center) rather than the full collection.

## Rough approach

1. Add a `bbox` QuerySpec parameter (`west`, `south`, `east`, `north`) or use
   `near` with a distance derived from the zoom level
2. `MapShell` calls a client-side fetch (or a server action) on `onMove` events,
   debounced ~300ms
3. SSR seeds only a small viewport's worth of markers for fast initial render
4. Marker state moves from `initialMarkers` prop into `MapShell` local state,
   merged/replaced on each fetch

## Trigger

Revisit when the `markers` collection approaches ~1000 records or when users
report slow map loads.
