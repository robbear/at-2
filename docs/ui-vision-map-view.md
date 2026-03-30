# UI Vision: Map View

The map view, either a Mapbox or Google Maps component coupled with markers, is the primary view seen by all users in Atlasphere.
No account is necessary to see this view.
A user may find the default marker set rendered on the Atlasphere map through the home page, `https://atlasphere.app`, or may come to the Atlasphere site having clicked on a shared URL link (from an email, or a link found in a social media posting, etc.) that represents an Atlasphere view - a position on the map coupled with a set of map markers.
See https://atlasphere.app/about for more information on Atlasphere map views.

## Design Goals

The map view should predominate the user interface, taking up as much screen real estate as feasible, giving visual context to the user regarding other Atlasphere components, always rooting the user in geographical context.
Where possible, Atlasphere should share the screen with the map view, dividing the screen vertically in Portrait mode, and horizontally in Landscape mode.
In cases where another UI element necessarily takes up all of the screen, we should consider for design purposes whether it makes sense to embed a snapshot of the current map context to give the user a visual sense of continuity.

The map resource (Mapbox or Google Map) is expensive and so the implementation design should be to load it once and only once. Within the map layout, the map component must remain mounted and never be torn down as the user navigates between map view, marker preview, and marker detail view.

## Map View as Visual Reflection of Queryspec

From a technical standpoint, the map markers rendered on the map reflect the search results defined in the current QuerySpec (see `queryspec.md`).

## Map View and Marker Preview

Each map marker represents data tied to an Atlasphere account, prepared by that account owner for presentation.

When a user taps or mouse-clicks on a map marker:
1. The URL in the address bar updates to `/{userId}/{timestamp}`
2. The marker preview slides into view alongside the map

### Preview Layout

In **Landscape mode**: the map shifts to one side, with the marker preview displayed
alongside it (side-by-side). The selected marker is centered in the map portion.

In **Portrait mode**: the view splits vertically — the map shifts to the top half,
and the marker preview occupies the bottom half (or vice versa, potentially
configurable as a user preference).

### Preview Interaction

- Clicking or tapping another map marker while a preview is displayed replaces
  the preview content with the newly selected marker's data (map recenters on
  the new marker; URL updates to the new marker's URL)
- The preview includes a **"Full view"** button to transition to the full
  Marker Detail View (see `ui-vision-marker-detail-view.md`)
- The preview can be dismissed, returning the user to the full-map view with
  no selected marker

### Preview Content

The marker preview is a compact representation of the marker's authored content:
typically the marker's title, snippet text, snippet image, and a "Full view"
button. It is not the full rendered MDX — that is the detail view.
