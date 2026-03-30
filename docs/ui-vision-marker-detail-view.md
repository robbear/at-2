# UI Vision: Marker Detail View

The Marker Detail View is the full, immersive display of a map marker's
authored content (rendered MDX). It is intended to occupy the primary screen
real estate, giving the user a web-page-like experience of the marker author's
creation.

## URL

The detail view has its own URL: `/{userId}/{timestamp}/detail`

Navigating directly to this URL loads the detail view for that marker.

## Navigation

### Entering detail view
The user enters the detail view by clicking the **"Full view"** button in the
Marker Preview (see `ui-vision-map-view.md`).

### Returning to the map
The detail view includes a **"Return to map"** button (or link) that navigates
the user back to `/{userId}/{timestamp}` — the split map/preview state for the
same marker.

The browser **back button** also works: since the URL changed when entering
the detail view, the back button returns the user to the previous URL
(`/{userId}/{timestamp}` or wherever they came from).

## Layout

The detail view replaces the map view for full screen immersion. The map is
not visible while the detail view is active (though it remains mounted in
memory per the SPA design — it is simply not displayed).

Consider embedding a small static map thumbnail or the marker's geographic
context as a visual anchor within the detail view, to maintain the user's
sense of place.

## Content

The detail view renders the full MDX content authored by the marker's owner.
This includes:
- Title and full descriptive text (rendered MDX)
- Images
- Embedded video (YouTube, etc.)
- Any other MDX-supported content

Legacy markers from v1 may contain old custom markdown extensions that render
as raw text — this is acceptable until a migration tool is built.

## Marker Preview

See `ui-vision-map-view.md` for more information.

The Marker Preview is a compact representation of the same marker content,
viewed side-by-side with the map view. It is not the full detail view.
