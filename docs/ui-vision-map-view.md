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

## Map View Layout

The map is bounded at the top by a header showing the Atlasphere logo, and icons for the search interface, the editor interface (when a user is signed in), URL sharing, and the menu.
It is bounded at the bottom by a footer of the same vertical dimensions as the header.
The footer shows, centered, the number of markers displayed on the map (we may add more information in the footer later).
A directional chevron icon accompanies the count: pointing up (↑) when the list is hidden to invite opening, pointing down (↓) when the list is visible to signal that tapping again will dismiss it.
When the list is open the footer also changes its visual treatment (highlighted background, contrasting text) to reinforce that it is an active control.

When the user clicks or taps on the footer, the marker selector list is revealed in the area between the header and the footer.
The footer remains pinned at the bottom of the screen at all times — it does not move to become the top of the list.
The marker selector becomes a means by which the user can see a list of all the markers on the map, listed in reverse-chronological order by creation date, rendered by each marker's snippetImage and snippetText, and including author information and creation date.
Layout appropriate views are used for each item in the list (image to the left and snippet text to the right in wide screen layouts, image over text in mobile).
Tapping on a list item behaves the same as tapping on a map marker — it navigates to the selected marker + preview mode and removes the list view.
Swiping a list item to the left past a threshold (approximately half the item width) is an alternative gesture for dismissing the list, identical in outcome to tapping the footer.
The list view does not affect page/URL state.
Tapping the footer again dismisses the list, revealing the map with the footer in its usual position at the bottom of the screen.

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

In both cases, the views are separated by a draggable splitter that allows the user to resize the map and preview areas — left-to-right in landscape, top-to-bottom in portrait.

Splitter constraints:
- **Initial split**: 50% each.
- **Minimum preview**: the preview must occupy at least 10% of the available space; the splitter cannot be dragged to fully eliminate the preview.
- **Map collapse gesture**: when the splitter is dragged such that the map is reduced to 5% or less of the available space, the action is treated as equivalent to tapping the **"Full view"** button — the app transitions to the full Marker Detail View. This gives users a natural swipe gesture to enter the detail view without hunting for a button.

### Preview Interaction

- Clicking or tapping another map marker while a preview is displayed replaces
  the preview content with the newly selected marker's data (map recenters on
  the new marker; URL updates to the new marker's URL)
- The preview includes a **"Full view"** button to transition to the full
  Marker Detail View (see `ui-vision-marker-detail-view.md`)
- Moving the slider such that the map is obscured to 5 percent or less is treated the same as the user clicking on the **"Full view"** button (see above).
- The preview can be dismissed, returning the user to the full-map view with
  no selected marker

### Preview Content

The marker preview renders the marker's **full MDX content** — the same content as the Marker Detail View, displayed in the smaller side-by-side frame. There is no truncation or snippet-only view; the user can read the complete marker post without navigating away from the map.

The preview panel respects the same content flags as the detail view (e.g. `hideSnippetImageInDetails` suppresses the hero snippet image in both contexts).

The **"Full view"** button and the map-collapse splitter gesture both navigate to the Marker Detail View (`/{userId}/{timestamp}/detail`), which provides a full-screen, immersive reading experience. See `ui-vision-marker-detail-view.md`.
