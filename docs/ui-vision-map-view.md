# UI Vision: Map View

The map view, either a Mapbox or Google Maps component coupled with markers, is the primary view seen by all users in Atlasphere.
No account is necessary to see this view.
A user may find the default marker set rendered on the Atlasphere map through the home page, `https://atlasphere.app`, or may come to the Atlasphere site having clicked on a shared URL link (from an email, or a link found in a social media posting, etc.) that represents an Atlasphere view - a position on the map coupled with a set of map markers.
See https://atlasphere.app/about for more information on Atlasphere map views.

## Design Goals

The map view should predominate the user interface, taking up as much screen real estate as feasible, giving visual context to the user regarding other Atlasphere components, always rooting the user in geographical context.
Where possible, Atlasphere should share the screen with the map view, dividing the screen vertically in Portrait mode, and horizontally in Landscape mode.
In cases where another UI element necessarily takes up all of the screen, we should consider for design purposes whether it makes sense to embed a snapshot of the current map context to give the user a visual sense of continuity.

The map resource (Mapbox or Google Map) is expensive and so the implementation design should be to load it once and only once, if possible in a Single Page Application design.

## Map View as Visual Reflection of Queryspec

From a technical standpoint, the map markers rendered on the map reflect the search results defined in the current QuerySpec (see `queryspec.md`).

## Map View and Marker Preview

Each map marker represents data tied to an Atlasphere account, prepared by that account owner for presentation.
When a user taps or mouse-clicks on a map marker, Atlasphere will present a preview of that data, which is typically a markdown-based representation of text and other resources such as images and video.
The design of this preview is currently open for discussion, but one idea is to slide the map view to the side (in Landscape mode), allowing a side-by-side space for a view of the rendered markdown such that the selected marker is centered in the map (on the left), with the previewed markdown on the right.
In Portrait mode, the view would split vertically, with the map shifting to the top, and the previewed markdown at the bottom (perhaps configurable through an environment variable so we can switch sides based on user preference).
There needs to be a means by which the user can switch from preview mode to full detail view.
There also needs to be a means by which the user can dismiss the preview.
Clicking or tapping on another map marker while the preview is up should shift the preview data to the data for the newly selected marker.
When a user clicks or taps on a map marker, the URL in the address bar is updated.
This preview design is open for discussion.
