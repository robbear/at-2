# UI Vision: Editor View

The Editor View is the means by which account users can add and edit map markers and associated content and resources including markdown, images, video, etc.
The Editor View is accessible only when a user is signed in.
The Editor View is intended to take up the primary screen real estate, replacing the map view.

## One Marker Editor

A common scenario is adding or editing a single marker where the user will spend the bulk of their effort writing markdown.
Early versions of Atlasphere will provide a basic textarea component for users to provide raw markdown, including MDX.
The Editor View needs to support uploading and referencing photos/images from their device and specifying references to YouTube videos.
Where possible, geographic data encoded in a user's photo can serve as a hint or guide as to the marker's location information.

## Location Data

How a user specifies location data for a map marker is an open area for discussion. Some ideas include:

* Using geographic data, where available, from uploaded photos from the user's device.
* Providing a map for the user to tap/click on.
* Using GPS data from the user's device.
* Using AI APIs to infer from the user's markdown location information

## Bulk Marker Editor

A concept we might explore is creating multiple markers at once based on the use of a template, some search criteria fed into an AI system, search results, and then a confirmation in the UI prior to the Atlasphere API call to bulk-create the markers on behalf of the user.

An example scenario: A real estate broker enters the address of her listing and a mile-radius search finds local businesses, parks, schools, and attractions to detail as markers to highlight on a map surrounding her listing in an Atlasphere link. This would be made possible with the assistance of an AI agent in a manner to be determined.
