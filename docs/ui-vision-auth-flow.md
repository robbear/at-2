# UI Vision: Auth Flow

The current auth flow user interface needs to be stylized and refitted into views more fitting with Atlasphere's UI Vision.

One thought is to have the Auth Flow use a lightbox theme over the map view so that these auth pages don't lose the visual sense of Atlasphere's map-based functionality.
On the other hand, we need to make sure we are not wasting map load resources given that the auth flow pages use separate resource URLs and page loads, so if this is not possible we should not force the issue.
Stylistically, we want to keep the Atlasphere sense through the registration and login process as much as possible.

The auth flow links need to originate on the menu panel. See `ui-vision-menu.md`.
