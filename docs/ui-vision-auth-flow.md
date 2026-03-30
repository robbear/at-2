# UI Vision: Auth Flow

Auth pages (`/auth/signin`, `/auth/register`, `/auth/reset`, `/auth/verify`,
etc.) are **separate full-page routes** outside the map layout. The map is not
mounted during auth flows. An additional map reload on return from auth is
acceptable.

## Design Language

Although the map is not present during auth flows, the Atlasphere visual
identity must be maintained throughout. Auth pages should share:
- Atlasphere color palette and typography
- Logo/branding presence
- Overall visual tone consistent with the rest of the application

The goal is for users to feel they are still within Atlasphere, not on a
generic login page, even without the map as backdrop.

## Auth Flow Entry Points

Auth flow is accessed via the Menu (see `ui-vision-menu.md`). The menu
provides links to sign in and register. Auth pages should include navigation
back to the map home page for users who change their mind.

## Post-Auth Return

After successful sign-in or registration, the user is returned to the map
home page (or the URL they were previously viewing if that can be preserved).
The map reloads on return — this is an accepted cost.

## Future Consideration

A lightbox or overlay approach (auth UI over the map) would eliminate the
map reload cost, but requires the map to be mounted before auth is triggered.
This is only viable for auth flows initiated from within the map view (e.g.
clicking "Sign in" in the menu while the map is already loaded). Direct
navigation to `/auth/signin` would still require a full page load.

For v2 initial implementation, full-page auth routes are the correct approach.
Lightbox auth can be revisited once the map layout is stable.
