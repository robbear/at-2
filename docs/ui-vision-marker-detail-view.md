# UI Vision: Marker Detail View

The Marker Detail View is the stylized rendered display of the user-authored markdown for a map marker.
The detail view is intended to occupy the primary screen real estate, replacing the map view in order for the user to be immersed in the web page like experience of viewing the marker author's creation.
The detail view is displayed with its own URL in the address bar - the same as the selected marker URL, with `/detail` appended.
Dismissing the detail view should return the user to the selected marker state which displays the marker preview.

## Marker Preview

See `ui-vision-map-view.md` for more information.

The Marker Preview is the same view of the rendered markedown, but in a smaller container, viewed side-by-side with the map view.
