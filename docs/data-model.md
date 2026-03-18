# Data Model

## Marker

A marker is a geo-tagged content post. It is the core entity in Atlasphere.

### Schema

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | `{userId}/{timestamp}` — also the public URL path |
| `userId` | `string` | Owner's public handle (e.g. `robbearman`) |
| `title` | `string` | Short display title, shown on map and in lists |
| `snippetText` | `string` | Brief preview text |
| `snippetImage` | `string` | R2 path to thumbnail/preview image |
| `contentUrl` | `string` | R2 path to full MDX content page |
| `markdown` | `string` | MDX source (authoring content — raw textarea input) |
| `tags` | `string[]` | Open-ended tags, no taxonomy |
| `location` | `GeoJSON Point` | `{ type: "Point", coordinates: [lng, lat] }` |
| `datetime` | `Date` | Event/content date (when the content event occurred) |
| `posttime` | `Date` | Creation timestamp (when the marker was posted) |
| `layerUrl` | `string?` | URL to a KML or GeoJSON map overlay layer |
| `layerType` | `"kml" \| "geojson" \| null` | Type of the overlay layer |
| `markerColors` | `{ fill: string, outline: string }?` | Custom RGB pin colors |
| `draft` | `boolean` | If true, not publicly visible |
| `archived` | `boolean` | Soft-archived, hidden from default views |
| `deleted` | `boolean` | Soft-deleted |

### Notes
- The `location` field has a geospatial index for `$nearSphere` proximity queries
- `datetime` and `posttime` are separate: a marker about a historical event can
  have a `datetime` in the past while `posttime` is when it was published
- Legacy `markdown` content from v1 may contain old custom extensions that will
  render as raw text — this is acceptable until a migration tool is built

---

## Profile

A user profile.

### Schema

| Field | Type | Notes |
|---|---|---|
| `_id` | `string` | Auth.js user ID (immutable) |
| `userId` | `string` | Public handle — appears in all URLs |
| `email` | `string` | Account email |
| `name` | `string` | Display name |
| `profilePicUrl` | `string?` | R2 path to profile picture |
| `bio` | `string?` | Short user bio |
| `createdAt` | `Date` | Account creation time |

### Notes
- `userId` is the public-facing identifier used in marker URLs and search
- Profile pictures are stored in R2 (never as base64 in MongoDB)

---

## MongoDB collections

| Collection | Contents |
|---|---|
| `markers` | All marker documents |
| `profiles` | All user profile documents |

### Atlas cluster strategy

at-2 shares the existing MongoDB Atlas cluster with v1 but uses a **separate database**:

- v1 database: `atlasphere` (do not touch)
- v2 database: `atlasphere-v2`

This avoids additional Atlas cost while keeping v1 data fully isolated. Migration
scripts can read from `atlasphere` when needed.

### Indexes
- `markers.location` — 2dsphere geospatial index (required for `$nearSphere`)
- `markers.userId` — for user-scoped queries
- `markers.tags` — for tag-based queries
- `markers.posttime`, `markers.datetime` — for date range queries
- `profiles.userId` — unique, for lookup by handle
- `profiles.email` — unique, for auth lookup
