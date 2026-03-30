# UI Vision: Editor View

The Editor View is the means by which account users can add and edit map markers and associated content and resources including markdown, images, video, etc.
The Editor View is accessible only when a user is signed in.
The Editor View is intended to take up the primary screen real estate, replacing the map view.

## One Marker Editor

A common scenario is adding or editing a single marker where the user will spend the bulk of their effort writing markdown.
Early versions of Atlasphere will provide a basic textarea component for users to provide raw markdown, including MDX.
The Editor View needs to support uploading and referencing photos/images from their device and specifying references to YouTube videos.
Where possible, geographic data encoded in a user's photo can serve as a hint or guide as to the marker's location information.

## Location Input

For the initial implementation, the user specifies a marker's location by
**tapping or clicking on the map**. A map is presented within the editor
(or the existing map is reused) and the user taps/clicks to set the pin location.

Geographic data (EXIF GPS) from uploaded photos serves as a hint to suggest
a location, which the user can accept or adjust.

**Long-term direction:** AI inference of location from the user's markdown text
is a desirable future capability — for example, inferring that a marker about
"the Golden Gate Bridge" should be placed in San Francisco.

## Markdown Authoring

Content is authored in a **plain textarea** accepting raw MDX input. No rich
editor for the initial implementation — power users are the initial audience
and are comfortable with raw markdown.

## Bulk Marker Editor

A concept for future exploration: creating multiple markers at once based on
the use of a template, some search criteria fed into an AI system, search
results, and then a confirmation in the UI prior to the Atlasphere API call
to bulk-create the markers on behalf of the user.

**Example scenario:** A real estate broker enters the address of her listing
and a mile-radius search finds local businesses, parks, schools, and
attractions to detail as markers highlighting the neighborhood. An AI agent
assists in generating marker content from search results. The user reviews
and confirms before publishing.

This represents a significant monetization opportunity — AI-assisted content
creation at scale, with white-label applications for real estate, tourism,
education, and local journalism.
