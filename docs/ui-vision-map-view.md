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
When the user clicks or taps on the footer, the marker selector list is revealed fully to the extent under the header, covering the map.
The marker selector becomes a means by which the user can see a list of all the markers on the map, listed in reverse-chronological order by creation date, rendered by each marker's snippetImage and snippetText, and including author information and creation date.
Layout appropriate views are used for each item in the list (image to the left and snippet text to the right in wide screen layouts, image over text in mobile).
Tapping on the list item behaves the same as tapping on a map marker - it reveals the map in selected marker + preview mode, removing the list view.
The list view does not affect page/URL state in the same way that tapping on the menu icon does not.
The top of the list view is the same as the footer view - the number of markers active on the map.
The list of marker snippet information scrolls under that pinned footer view, and if the user taps on the footer view again, the list is dismissed, revealing the map again with the footer returning to its place at the bottom of the screen.

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

In both cases, the views are separated by a splitter that allows the user to size the amount of map versus preview visable, either left-to-right in the landscape case, or top-to-bottom in the portrait case.
The initial split is 50 percent each.
The user is constrained to moving the slider such that the preview must take up at least 10 percent of the available space. The user cannot fully eliminate the preview from the viewport.
However, when the slider moves to the point where the map is reduced to 5 percent of the available space, that action is treated as if the user had tapped on the `Full view` button, resulting in a transition to the detail view.
That is, a swipe of the slider to eliminate the map and reveal the contents of the preview is to treat it as a gesture that the user wants to see the detail view.

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

The marker preview is a compact representation of the marker's fully authored content, the full rendered MDX.
It is the same as the detail view, just in a smaller view frame.
See `ui-vision-marker-detail-view.md` for details on the rendered view.
