# URL Spec

All URL-addressable states in Atlasphere.

---

## Map / search view

```
/
/?{queryspec params}
```

The root path renders the map. Any QuerySpec parameters in the query string
filter what's shown. This is the primary shareable URL format — copy the URL
from any filtered map view and it will reproduce that exact view.

See `/docs/queryspec.md` for the full parameter reference.

---

## Marker deep links

```
/{userId}/{timestamp}
/{userId}/{timestamp}/details
```

- `/{userId}/{timestamp}` — marker map view (map centered on the marker, marker selected)
- `/{userId}/{timestamp}/details` — full content view

The marker ID is `{userId}/{timestamp}`, where:
- `userId` is the author's public handle (e.g. `robbearman`)
- `timestamp` is the Unix timestamp (ms) at time of creation

Example: `/robbearman/1708900000000`

**This format is a core invariant.** Do not change it — existing v1 content and
external links depend on it.

---

## User profile

```
/u/{userId}
```

Displays a user's profile and their public markers.

---

## Auth routes (Auth.js)

```
/api/auth/signin
/api/auth/signout
/api/auth/callback/{provider}
/api/auth/session
```

Standard Auth.js routes — do not customize paths.

---

## Viewport params

```
/?lat={latitude}&lng={longitude}&zoom={zoom}
```

Encode the current map viewport so any view is shareable as a URL.

| Param | Type | Default | Description |
|---|---|---|---|
| `lat` | `number` | `33.8337` | Map center latitude |
| `lng` | `number` | `-60.8509` | Map center longitude |
| `zoom` | `number` | `2` | Map zoom level |

Defaults can be overridden by the `DEFAULT_LAT`, `DEFAULT_LNG`, and `DEFAULT_ZOOM`
env vars. Combine freely with QuerySpec params and `?mp=`.

Example:
```
/?lat=37.3861&lng=-122.0839&zoom=10&userIds=robbearman&mp=1
```

---

## Map provider param

```
?mp=0   — Google Maps
?mp=1   — Mapbox
```

Can be combined with any other query params. Overridden by `MAP_PROVIDER_OVERRIDE`
env var if set.
