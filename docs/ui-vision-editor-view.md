# UI Vision: Editor View

The Editor View is the means by which account users can add and edit map markers
and associated content and resources including markdown, images, video, etc.
The Editor View is accessible only when a user is signed in.

## Layout

The editor uses a **vertical split**: map on top, editor form on bottom.

- A **draggable handle** (`⋯`) between the two panels lets the user resize the
  split.
- Default split: **35% map / 65% editor** (25% / 75% on mobile).
- Map minimum height: **80px**; maximum: **60% viewport height**.
- Split position is stored in component state only (not persisted to the URL).

The editor overlay sits in the existing `(map)` route group. MapShell detects
the editor route (`/markers/new` or `/{userId}/{timestamp}/edit`) and renders it
as a full-screen overlay, hiding the main background map.

## Routes

- `/markers/new` — **create mode**: new marker, no pre-population.
- `/{userId}/{timestamp}/edit` — **edit mode**: marker loaded from API, form
  pre-populated.

Both routes require authentication. If not signed in, redirects to
`/auth/signin?callbackUrl=<currentUrl>`. In edit mode, if the signed-in user
does not own the marker, a 403 error is shown.

## Map panel (top)

- Shows the map (Mapbox or Google, same provider logic as the main map).
- Displays a single **draggable teardrop pin** at the current marker location,
  styled with the form's current marker color.
- When the user **drags and releases the pin**, the location fields update.
- When the user **clicks the map** (no pin yet), the pin is placed at that
  location.
- If no location is set, a hint prompts "Click the map to set location."

## Editor form panel (bottom)

Scrollable. Fields in order:

1. **Title** — required text input
2. **Snippet text** — optional single-line text (preview and social description)
3. **Tags** — chip input; press Enter or "Add" button to add
4. **Marker color** — color picker for `markerColors.fill`; default `#0094dd`
5. **Draft toggle** — checkbox: "Save as draft (not publicly visible)"
6. **Images** — image upload section (see below)
7. **Content (MDX)** — plain textarea for raw MDX input
8. **Datetime** — date+time picker for the event/activity date
9. **Location** — read-only lat/lng display (updated by pin interactions)

## Image management

### Sequential naming

Images are numbered sequentially in upload order: `1.jpg`, `2.jpg`, `3.jpg`, etc.,
regardless of original filename. When an image is removed, remaining images are
re-numbered (removing "2.jpg" from [1, 2, 3] produces [1.jpg, 2.jpg]).

### Image grid

Uploaded images appear as a thumbnail grid. Each thumbnail shows:

- The sequential name label (`1.jpg`, `2.jpg`, …)
- A **star icon** (filled = cover image, outline = not cover)
- An **× button** to remove the image

Clicking the star on any image sets it as the cover (`snippetImage`). The cover
image has a colored border (`brand.blue`).

### Cover image (`snippetImage`)

- Defaults to the first image in the array.
- When the cover image is removed, the next image (new `1.jpg`) automatically
  becomes the cover.
- When all images are removed, `snippetImage` is set to `""`.
- The user can select any image as cover by clicking its star.
- Stored in MongoDB as the R2 path of the selected image.

### Client-side resize

Images are resized client-side to **1024px max** using `pica` before upload
(JPEG, quality 85). This happens on file selection, before any network request.

### MDX image references

Below the MDX textarea, a helper note explains:
> Reference uploaded images by number, e.g. `![caption](1.jpg)`

At render time (in `MarkerDetailView`), `1.jpg` references are resolved to
full R2 URLs using the marker's `images` array.

## Publish / Save Transaction

Two-phase approach.

### Phase 1: Upload to R2

For each new (not-yet-uploaded) image:
1. Request a presigned URL: `POST /api/v1/upload/presign`
2. PUT the resized file to the presigned URL
3. Retry up to 3 times (1s, 2s, 4s backoff) on failure
4. If any upload fails: abort. Do NOT proceed to Phase 2. Report failed files.

Progress shown: "Uploading images… (2/3)"

### Phase 2: Save to MongoDB

Only after all uploads succeed:
- **Create**: `POST /api/v1/markers`
- **Edit**: `PUT /api/v1/markers/{userId}/{timestamp}`

If the MongoDB save fails:
- "Your images were uploaded but the marker could not be saved."
- "Retry save" button re-attempts Phase 2 without re-uploading.

On success: navigate to `/{userId}/{timestamp}`.

## Marker deletion

- **Delete marker** button (red, outlined) in edit mode only.
- Confirmation dialog: "Delete this marker? This cannot be undone."
- `DELETE /api/v1/markers/{userId}/{timestamp}` (soft-delete sets `deleted: true`)
- On success: navigate to `/`.
- On failure: error toast, stay in editor.

## Header "+" button

A `+` button (Lucide `Plus`) is shown in the header between the share icon and
the menu icon, **visible only when signed in**. Navigates to `/markers/new`.

## Social meta tags

Both `/{userId}/{timestamp}` (preview) and `/{userId}/{timestamp}/detail` export
`generateMetadata`, producing:

- `og:title` — marker title
- `og:description` — snippetText, or "View this location on Atlasphere."
- `og:image` — resolved from `snippetImage`:
  - Legacy S3 full URL → used as-is
  - R2 path → prepended with `NEXT_PUBLIC_R2_PUBLIC_URL`
  - Empty → Atlasphere logo fallback
- `twitter:card` — `summary_large_image`

## Data model additions

- `images: [{ name: string, r2Path: string }]` on both `Marker` and
  `CreateMarker` / `UpdateMarker` (defaults to `[]`)
- `snippetImage` continues as a separate top-level field storing the R2 path of
  the selected cover image

## One Marker Editor

A common scenario is adding or editing a single marker where the user will spend
the bulk of their effort writing markdown. The initial implementation provides a
plain textarea for raw MDX input.

## Long-term direction

- **EXIF GPS from photos** could hint at location (not yet implemented).
- **AI inference of location** from the user's markdown text is a desirable
  future capability (e.g. inferring "Golden Gate Bridge" → San Francisco).
- **Bulk Marker Editor**: creating multiple markers at once with AI-assisted
  content generation — significant monetization opportunity for real estate,
  tourism, education, and local journalism.
