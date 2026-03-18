# Storage (Cloudflare R2)

All user-generated content (images, profile pictures, rendered MDX content) is
stored in Cloudflare R2.

---

## Why R2

- S3-compatible API — same presigned upload flow as AWS S3
- Zero egress fees (unlike S3)
- Generous free tier: 10GB storage, 1M Class A ops/month, 10M Class B ops/month
- Compatible with Vercel deployment without needing AWS credentials in production

---

## Bucket layout

```
accounts/{userId}/images/{timestamp}/{filename}   — marker images
accounts/{userId}/html/{timestamp}.mdx            — marker MDX content source
accounts/{userId}/profile/{filename}              — profile picture
```

- `userId` is the author's public handle
- `timestamp` matches the marker's creation timestamp (ties content to marker ID)

---

## Presigned upload flow

The server never proxies binary data. All uploads go directly from the client
to R2 via a presigned URL.

### Flow

1. Client calls `POST /api/v1/upload/presign` with `{ filename, contentType, markerTimestamp }`
2. API validates the session, generates a presigned R2 PUT URL (TTL: 5 minutes)
3. API returns `{ uploadUrl, r2Path }` to the client
4. Client uploads the file directly to `uploadUrl` via HTTP PUT
5. Client saves `r2Path` to the marker payload before submitting to the API

### Client-side image resizing

Before requesting a presigned URL, images must be resized client-side:
- Max dimension: 1024px (width or height)
- Use the `pica` library for high-quality downsampling
- Preserve aspect ratio
- Output format: JPEG (quality 85) for photos, PNG for graphics with transparency

---

## Public access

R2 bucket is publicly readable — all content URLs are direct R2 public URLs.
No signed read URLs needed for public content.

Profile pictures and marker images are public. Presigned URLs are only needed
for writes.

---

## Legacy v1 content (AWS S3)

v1 marker content and images are stored in AWS S3. at-2 does **not** migrate
this content at launch.

- Legacy markers in MongoDB may reference S3 URLs in `contentUrl` and `snippetImage`
- These URLs remain valid and are rendered as-is in v2
- All new content created in v2 goes to R2
- A future bulk migration (S3 → R2) may be run later, or legacy content may be
  purged; decision deferred
- AWS S3 bucket remains active for as long as v1 is live or legacy content is needed

## Env vars

| Var | Description |
|---|---|
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_PUBLIC_URL` | Public base URL for the R2 bucket |
