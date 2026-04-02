# UI Vision: Search View

The Search View lets users construct a `QuerySpec` query, browse its results on the
map, and share the resulting URL. Every filter state is URL-serializable so any
search result is a shareable link.

---

## Entry point — header icons

Two icon buttons sit to the right of the logo, before the hamburger:

```
[Logo]     [SlidersHorizontal] [Share2] [☰ Menu]
```

### Search icon (`SlidersHorizontal`)

- Lucide `SlidersHorizontal`, white, on the brand-blue header bar
- Clicking toggles the search panel open/closed
- When a non-default `QuerySpec` is active (any filter param present), a small
  `brand-green` (#93c572) dot appears on the icon as an indicator
- Active state is computed by `isQuerySpecActive(searchParams)` in
  `src/lib/queryspec-active.ts`

### Share icon (`Share2`)

- Lucide `Share2`, white, on the brand-blue header bar
- Clicking copies `window.location.href` to the clipboard via
  `navigator.clipboard.writeText()`
- On success: a "Link copied to clipboard!" toast appears at the bottom-center
  of the screen for 2 seconds (fade in / stay / fade out)
- Implemented as a minimal custom toast (no extra dependency)

---

## Search panel

A slide-down overlay that appears immediately below the header when the search
icon is clicked.

### Layout

- `position: fixed`, full width, `top-[52px] md:top-[60px]` (below the header)
- `max-h-[80vh]` with internal scroll if content overflows
- White background (`bg-surface`) with a bottom shadow
- Smooth CSS transition: `translate-y` + `opacity` slide down/up
- `z-30` — above map overlays, below header (`z-40`)

### State lifecycle

1. **On open** — read all current `QuerySpec` params from `useSearchParams()`
   and populate the form fields
2. **On submit** — construct new `URLSearchParams` from the form state, call
   `router.replace('?' + params.toString())`, close panel
3. **On "Clear all"** — call `router.replace('/')`, close panel

No live updates as the user types; changes are only applied on submit.

### Footer

- **Search** button: brand-blue, full width — applies the QuerySpec
- **Clear all** link: resets to default view

---

## Panel sections

All four sections are collapsible (open by default).

### Tags

- Removable chip pills (brand-blue background, white text, × button) for
  selected tags
- Text input with client-side autocomplete: fetches a sample of public markers
  and extracts unique tags (acceptable for initial implementation)
- **AND / OR toggle**: "Match all" / "Match any" (defaults to "Match any",
  i.e. `allTags=false`)
- URL params: `tags[]`, `allTags`

### Authors

- Removable chip pills for selected userIds
- Free-text input (simple userId entry for initial implementation)
- **AND / OR toggle**: "Match all" / "Match any"
- URL params: `userIds[]`

### Location radius

- Label: "Near current map center"
- Read-only display of current map center:
  `"Center: 37.3861°N, 122.0839°W"` (read from `lat`/`lng` viewport URL params)
- Radius slider: 1–500 km, step 5, default 40 km
- Current value shown next to slider: `"40 km"`
- When active, writes `near.lat`, `near.lng` (from viewport params), and
  `near.distance` (in **meters** — multiply km × 1000) to URL params
- URL params: `near.lat`, `near.lng`, `near.distance`

### Date range

- Preset row: "Last 7 days" | "Last 30 days" | "Last year" | "All time"
  (clicking a preset populates pickers; "All time" clears both pickers)
- Start date picker + End date picker (`<input type="date">`)
- **Toggle**: "Posting date" / "Activity date" (`usePosttime`)
- URL params: `dateRange.start`, `dateRange.end`, `dateRange.usePosttime`

---

## `isQuerySpecActive` helper

`src/lib/queryspec-active.ts` — pure function, no React dependencies:

```ts
export function isQuerySpecActive(searchParams: URLSearchParams): boolean {
  return (
    searchParams.has("tags") ||
    searchParams.has("userIds") ||
    searchParams.has("near.lat") ||
    searchParams.has("dateRange.start") ||
    searchParams.has("dateRange.end")
  );
}
```

---

## Component wiring

- `src/app/(map)/layout.tsx` — server component; fetches markers, renders
  `<MapLayoutClient>` (client boundary)
- `src/components/layout/MapLayoutClient.tsx` — client component; owns
  `searchPanelOpen` state; reads `searchParams` via `useSearchParams()`;
  renders `Header` + `SearchPanel` + `MapShell`
- `src/components/layout/Header.tsx` — accepts `onSearchToggle` and
  `searchActive` props; renders Search + Share + Menu icons
- `src/components/search/SearchPanel.tsx` — slide-down panel with four
  collapsible sections
