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

## Env vars

| Var | Description |
|---|---|
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_PUBLIC_URL` | Public base URL for the R2 bucket |
