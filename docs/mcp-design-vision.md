# Atlasphere MCP — Design Vision

## What This Document Is

This document captures the motivation, design decisions, and implementation roadmap for
adding Model Context Protocol (MCP) support to Atlasphere. It is written as a backgrounder
for someone who was not present in the design discussion, and as a prompt-ready spec for
implementation. Reading this document end-to-end should provide everything needed to
understand why each decision was made and what to build next.

---

## What MCP Is and Why It Matters Here

The Model Context Protocol is an open standard that lets AI assistants (Claude, Cursor,
Codex, and others) interact with external services through a structured set of "tools."
When an MCP server is connected to a client like Claude Desktop, the AI can call those
tools in the course of a conversation — reading data, creating content, uploading files —
without the user switching to a browser or terminal.

For Atlasphere specifically, MCP means that a user can describe what they want in natural
language and have an AI assistant create geo-tagged markers, source images, and produce
a shareable map URL — all within a single conversation. The map becomes an output of an
AI-assisted creative or professional workflow rather than a manually assembled artifact.

---

## Primary Use Cases

### Walking Tour Authorship

A user asks: *"Create a 6-stop walking tour of North Beach in San Francisco. Use Wikipedia
images where available."*

The assistant identifies locations, resolves their coordinates, sources appropriate images
from public URLs, writes descriptive MDX content for each stop, creates six markers, and
returns a shareable Atlasphere URL filtered to that tour's tag. The user receives a
publication-ready walking tour without touching the Atlasphere web UI.

### Real Estate Neighborhood Marketing

A real estate broker asks: *"Create a listing page for 123 Main Street showing nearby
parks, coffee shops, and grocery stores within half a mile."*

The assistant geocodes the property address, searches for nearby points of interest,
sources images for each location, writes compelling markdown content describing why each
amenity enhances the listing, creates a marker for each, and returns a URL centered on
the property showing all surrounding markers. The broker shares that URL in their
marketing materials.

This scenario illustrates two important design requirements that are discussed in detail
below: the need for a place-discovery tool (not just geocoding), and the cost of
many sequential tool calls on the client's context window.

### Automated Content Aggregation

A developer builds a daily job that scans a regional news site's RSS feed. For each
article covering a geo-tagged story — a city council vote, a new business opening, a
road closure — the job extracts the article's `og:image` and `og:description` meta tags,
geocodes the address mentioned in the headline, and calls `create_marker` with those
values directly.

No image is copied or resized. The marker stores the news site's `og:image` URL as-is.
The result is a living map of local news, updated automatically, with no human authoring
step. This scenario anchors a core design decision about images in the automation context:
external URLs are first-class values, not inputs to a copy pipeline. Copying to R2 is an
explicit opt-in, not the default.

---

## Architecture Decision: Remote MCP Integrated into `packages/api`

### The Question

Should the MCP server be:

- **A separate local process** (`packages/mcp`) that runs on the user's machine and
  calls the Atlasphere API over HTTP, or
- **A remote server** integrated directly into `packages/api` as a route handler,
  reachable at a URL like `https://at-2api-production.up.railway.app/mcp`?

### Why Remote and Integrated

**Distribution is solved by configuration, not installation.** For HTTP-capable clients
(Claude Code CLI, Cursor, Windsurf), a user connects by adding one entry to their config:

```json
{ "mcpServers": { "atlasphere": { "type": "http", "url": "https://at-2api-production.up.railway.app/api/v1/mcp", "headers": { "Authorization": "ApiKey atls_..." } } } }
```

No npm install, no Node.js version requirement, no local process to keep running. For a
non-technical user like a real estate broker, this is the difference between "this works"
and "this requires a developer to set up."

Claude Desktop is the current exception to this — it accepts only stdio processes in its
`mcpServers` config, not remote URLs. This is a client-side limitation, not a protocol
gap. See "Connecting MCP Clients" below for the full picture.

**Deployment is trivial.** Deploy the API once; every user automatically gets the latest
version of every tool. A separate package would need versioning, npm publishing, and user
upgrade instructions.

**Building a separate service means rebuilding the monolith.** This was confirmed by
Railway's own experience building their remote MCP server. They initially designed a
separate service and documented the problem directly:

> *"We kept staring at rebuilding many of the main app's pieces — user sessions, OAuth
> grants, workspace/project permissions, dataloaders, encryption, analytics. What we were
> building was starting to look like an elaborate proxy back into the monolith."*

For Atlasphere, the equivalent list is: Auth.js session validation, R2 presign logic,
ownership checks, MongoDB access, Zod schema validation. All of it already exists in
`packages/api`. A separate MCP service would be a proxy back into Fastify.

**Tools call controllers directly.** When MCP is a route handler inside `packages/api`,
tool implementations can call the same service-layer functions that the REST route
handlers call. There is no extra HTTP hop, no token forwarding, no duplicated permission
logic. One source of truth for "create a marker."

**Cost.** Atlasphere operates under a near-zero monthly cost constraint. A separate
Railway service for MCP alone is not justified at this stage.

### The One Capability Tradeoff

A local MCP process has access to the user's filesystem. A remote MCP server does not.
This means `upload_image_from_file` — reading a photo from the user's local disk — is
not possible in the remote architecture.

This tradeoff is resolved by the image sourcing strategy described later in this
document. The short version: in the automation context, images are public URLs —
`og:image` tags, Wikimedia, Unsplash, or a user's own CDN. There is no local file to
read. For the social/manual authoring model, images are uploaded through the web UI,
which has full local file access. The filesystem gap simply does not apply to either
context.

### Transport: StreamableHTTP, Stateless

The MCP protocol supports multiple transports. The current standard for remote servers
is **StreamableHTTP** (which supersedes the older SSE transport). The implementation
should use stateless request handling — each tool call receives a fresh context resolved
from the bearer token. No server-side session is stored between calls.

Railway's route handler pattern is the direct model:

```typescript
// Inside packages/api — a Fastify route handler
async function handleMcpRequest(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    reply.status(401).send({ error: "Authentication required" });
    return;
  }

  const atlasCtx: AtlasContext = {
    user: request.user,
    db: mongoose.connection,
    // ... other shared context
  };

  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  });

  await server.connect(transport);
  await atlasContextStore.run(atlasCtx, () =>
    transport.handleRequest(request.raw, reply.raw, request.body),
  );
}
```

### Context Threading: AsyncLocalStorage

Tool handlers need access to the authenticated user and shared resources without having
those values threaded through every function argument. The pattern is `AsyncLocalStorage`:

```typescript
// packages/api/src/mcp/context.ts
export const atlasContextStore = new AsyncLocalStorage<AtlasContext>();

export function getAtlasContext(): AtlasContext {
  const ctx = atlasContextStore.getStore();
  if (!ctx) throw new Error("MCP tool called outside request context");
  return ctx;
}
```

Each MCP request runs inside `atlasContextStore.run(atlasCtx, ...)`, so any tool
handler anywhere in the call stack can call `getAtlasContext()` and receive the
fully-resolved, auth-checked context for that request.

---

## Authentication: API Keys First

### Why Not OAuth

OAuth 2.0 with PKCE is the MCP spec's recommended auth mechanism for remote servers.
Railway was able to implement it cleanly because they already had an OIDC provider
that their MCP server's `/.well-known/oauth-authorization-server` endpoint could
point back to — no new auth infrastructure required.

Atlasphere uses Auth.js, which is a session consumer, not an OAuth provider. Adding
OAuth server capability to Auth.js is non-trivial and not justified at this stage.

### API Keys

Users generate an API key through a settings page in the Atlasphere web UI. The key is
scoped to the generating user; all MCP operations using that key act as that user. The
key is passed as `Authorization: ApiKey {key}` on every request to the MCP endpoint.

New API endpoints required:

```
POST   /api/v1/auth/api-keys        — generate a key for the authenticated session user
DELETE /api/v1/auth/api-keys/{id}   — revoke a key
GET    /api/v1/auth/api-keys        — list active keys (metadata only, not the key values)
```

Keys are stored hashed in MongoDB. The MCP route handler validates the `ApiKey` header
before constructing the `AtlasContext`.

### Future: OAuth

When Atlasphere's user base grows and the broker-as-non-technical-user scenario becomes
primary, upgrading to OAuth eliminates the "generate and manage an API key" step. This
is a well-defined future upgrade path and does not affect the initial implementation.

---

## Connecting MCP Clients

### Client Compatibility

| Client | HTTP MCP (`url:`) | Notes |
|---|---|---|
| Claude Code CLI | ✓ | Works today via `--transport http` |
| Cursor / Windsurf | ✓ | Works today via settings UI or config file |
| Claude Desktop | ✗ | stdio only — see workaround below |

StreamableHTTP is the MCP standard transport. Claude Desktop is the outlier; HTTP support
is expected in a future release.

### Claude Code CLI

Claude Code CLI is also a first-class test environment for the Atlasphere MCP server,
useful for validating tool behavior without leaving the development workflow.

**Local development** (points at `localhost:3001`):

```bash
claude mcp add --scope user --transport http \
  atlasphere \
  http://localhost:3001/api/v1/mcp \
  --header "Authorization: ApiKey atls_..."
```

**Production:**

```bash
claude mcp add --scope user --transport http \
  atlasphere \
  https://at-2api-production.up.railway.app/api/v1/mcp \
  --header "Authorization: ApiKey atls_..."
```

Use `--scope user` so the API key is stored in `~/.claude.json` and never committed to
the repository. The resulting config entry:

```json
{
  "mcpServers": {
    "atlasphere": {
      "type": "http",
      "url": "https://at-2api-production.up.railway.app/api/v1/mcp",
      "headers": {
        "Authorization": "ApiKey atls_..."
      }
    }
  }
}
```

Verify with `claude mcp list`. Once connected, Claude Code will use Atlasphere tools
when relevant without requiring explicit tool-name invocation.

### Cursor / Windsurf

Same `type: "http"` + `url` + `headers` structure, configured via each client's MCP
settings panel or config file. Consult the respective client documentation for the
exact file path.

### Claude Desktop: Current Workaround

Claude Desktop accepts only stdio processes. The workaround uses `packages/api/src/mcp/stdio.ts`,
which connects directly to MongoDB and identifies the user via `ATLAS_USER_ID`:

```json
{
  "mcpServers": {
    "atlasphere-local": {
      "command": "/path/to/tsx",
      "args": ["/path/to/packages/api/src/mcp/stdio.ts"],
      "env": { "ATLAS_USER_ID": "your-handle" }
    }
  }
}
```

This is a **developer-only path**. It requires Node.js, a local checkout of the repo,
and knowledge of internal paths. It does not use API key authentication — trust is
derived from ownership of the machine running the process. It is not the user experience
described in "Why Remote and Integrated."

The correct non-developer solution for Claude Desktop is a thin npm package
(`atlasphere-mcp`) that reads `ATLASPHERE_API_KEY` from env and proxies
stdio ↔ the production HTTP endpoint. The Claude Desktop config would then be:

```json
{
  "mcpServers": {
    "atlasphere": {
      "command": "npx",
      "args": ["-y", "atlasphere-mcp"],
      "env": { "ATLASPHERE_API_KEY": "atls_..." }
    }
  }
}
```

This package is not yet built. The decision is to build it when the first non-developer
user needs Claude Desktop access, or when Claude Desktop adds HTTP MCP support —
whichever comes first. Publishing an npm package carries versioning, security, and
maintenance overhead that is not justified at zero non-developer users.

---

## Tool Surface Design

### Fewer Tools Is Better

Railway's production experience surfaces an insight that applies directly here: **every
tool definition lives in the client's prompt on every turn**, before the user's actual
request. A 25-tool surface costs the user 25 tool descriptions' worth of context on
every interaction. Larger tool lists also measurably degrade model tool-selection
accuracy.

The target is a minimal, bounded surface where each tool does exactly one thing that
cannot be inferred from another tool.

### The Cost of Sequential Tool Calls

There is a second, often overlooked context cost: each tool-call round-trip consumes
context when the result returns. The real estate broker scenario — 10 POIs, each
requiring a coordinate lookup, an image upload, and a marker creation — is 30 tool-call
results filling the context window before the user sees a final answer. This degrades
response quality and burns the user's context budget.

The `atlasphere_agent` tool, described below, addresses this.

### Proposed Tool Surface (6 tools)

| Tool | Purpose |
|---|---|
| `create_marker` | Create a single marker with title, MDX body, coordinates, tags, and images |
| `update_marker` | Update fields on an existing marker by ID |
| `delete_marker` | Delete a marker by ID |
| `search_markers` | Search/filter markers by QuerySpec parameters |
| `upload_image_from_url` | Fetch a public image URL, resize, and copy to R2 for durable storage; returns an asset reference. Explicit opt-in — `create_marker` accepts external URLs directly. |
| `atlasphere_agent` | Natural-language delegation for complex multi-step tasks |

### The `atlasphere_agent` Tool

This is the most important tool on the surface. Its purpose is to accept a natural-language
description of a complex operation and orchestrate the full multi-step workflow
server-side, returning one consolidated result.

**Client experience (without `atlasphere_agent`):**
```
User: "Create neighborhood markers for 123 Main St"
→ geocode(listing address)              [result 1]
→ search_nearby(lat, lng, ...)          [result 2]
→ find_image_url(park)                  [result 3]
→ create_marker(park, imageUrl)         [result 4]
→ find_image_url(cafe)                  [result 5]
→ create_marker(cafe, imageUrl)         [result 6]
... × N locations
→ Final answer                          [30 round-trips consumed]
```

**Client experience (with `atlasphere_agent`):**
```
User: "Create neighborhood markers for 123 Main St"
→ atlasphere_agent("create neighborhood markers for 123 Main St, ...")
→ Final answer + shareable URL          [1 round-trip consumed]
```

The orchestration logic — POI discovery, image sourcing, marker creation — runs inside
Atlasphere's backend. The client pays one tool call's worth of context regardless of
how many markers are created. Atlasphere can improve the orchestration over time
(better image selection, richer markdown templates, smarter POI ranking) without any
changes to the MCP API surface.

A secondary benefit: because `atlasphere_agent` tracks which internal operations it
performs, Atlasphere gains real usage data on what users actually want — informing
which operations might eventually deserve promotion to top-level tools.

When `atlasphere_agent` sources images internally — from Wikimedia Commons, Unsplash,
or `og:image` tags — it stores external URLs by default. The user can request R2
storage explicitly in their natural-language prompt (for example: *"create the markers
and store the images permanently"*), in which case the agent calls `upload_image_from_url`
before each `create_marker`.

---

## Missing Capability: Place Discovery

The initial tool design included `geocode(placeName) → {lat, lng}`, which resolves a
known place name to coordinates. This is distinct from — and insufficient for — the
real estate scenario.

The real estate scenario requires **place discovery**: given a location and a category,
find nearby points of interest. These are completely different API operations:

- **Geocoding**: `"Whole Foods, Sunnyvale CA"` → `{lat, lng}` (you already know the name)
- **POI search**: `{lat, lng, radius: 0.5mi, type: "grocery_store"}` → list of nearby grocery stores (you do not know the names)

Without a POI search capability, the agent would have to fabricate business names and
hope the coordinates are correct — which produces unreliable content.

**Recommended data source:** OpenStreetMap via the Overpass API for POI discovery, and
Nominatim for geocoding. Both are free, require no API key for reasonable request rates,
and have no per-request cost. This fits the near-zero cost constraint.

For `atlasphere_agent`, POI search is an internal implementation detail — the tool
accepts a natural-language description and Atlasphere's agent queries Overpass internally.
A top-level `search_nearby` tool is not needed on the public MCP surface.

---

## Image Sourcing Strategy

### Two Authoring Models

Atlasphere supports two distinct authoring contexts with different image handling.

**Social/manual authoring** is the original model: a user takes photos on their phone,
writes about a place they visited, and creates a marker through the web UI. Images
originate on the user's device and are uploaded directly to R2 via the browser upload
flow. This model is fully supported and unchanged. See `/docs/storage.md`.

**Automation authoring** is the V2 addition: an AI agent, a scheduled job, or an API
integration creates markers in bulk. Images in this context are almost always already
available as public URLs — sourced from Wikimedia, Unsplash, `og:image` meta tags, or
the user's own cloud storage. The automation model uses those URLs directly without
copying them.

This document concerns automation. The rest of this section applies to that context.

### Two Image Storage Modes

`create_marker` accepts images in either of two forms:

| Mode | What is stored | When to use |
|---|---|---|
| **External URL** | The original public URL, stored as-is | Default for automation; fast, zero storage cost |
| **R2-backed** | An asset reference after fetch → resize → upload to R2 | Explicit opt-in when permanence matters |

External URL is the default. Link rot — an image URL becoming unreachable over time —
is an accepted trade-off, no different from any web page that depends on external
resources. Atlasphere does not implement an automatic durability store.

R2-backed storage is available when the user or agent explicitly wants it: call
`upload_image_from_url` first to copy the image into R2, then pass the returned asset
reference to `create_marker`. This is appropriate when sourcing from temporary URLs
(a Dropbox sharing link, a presigned URL with an expiry) or when the content is
intended to outlive the source.

### No Image Generation

AI-generated images are not appropriate for real locations, real businesses, or real
marketing content. Image generation is out of scope.

### Image Sources in Practice

**Open Graph image tags (`og:image`)**
News articles, business listings, and most modern web pages publish an `og:image` meta
tag. For content-aggregation workflows (news scrapers, event feeds), `og:image` is the
natural image source. Pass the URL directly to `create_marker` — no upload step required.

**Wikimedia Commons / Wikipedia**
The primary source for well-known locations: parks, landmarks, historic buildings,
neighborhoods. Images are Creative Commons licensed. Pass the public URL directly, or
call `upload_image_from_url` first if R2 durability is wanted.

**Unsplash**
Free for commercial use, no attribution required. Suitable for generic scenes — a coffee
shop atmosphere, a park in autumn, a shopping street. Public image URLs work directly.

**User's own cloud storage**
A real estate broker who has photographed a neighborhood can place those photos in a
Google Drive shared folder or Dropbox link and reference those URLs. If the URLs are
temporary or likely to expire, use `upload_image_from_url` to copy to R2 first. If the
URLs are stable, reference them directly.

### What `upload_image_from_url` Does

This tool is an explicit opt-in for R2 durability. It is not required for automation
that uses stable external URLs.

1. Receives a public image URL
2. Fetches the image server-side
3. Decodes and resizes to 1024px maximum dimension (matches the browser upload flow)
4. Calls `POST /api/v1/upload/presign` internally (same flow the web UI uses)
5. PUTs resized bytes to the returned R2 presigned URL
6. Returns `{ r2Path, name }` for inclusion in `create_marker`'s `images` field

The server never buffers the final PUT — the presign flow is used throughout.

### Future: Atlasphere-Native Image Library

A later phase could add an image library to the Atlasphere web UI: users upload personal
photos to their account's R2 path, and reference those images by name in MCP sessions
(`"use my image named 'golden-gate-sunrise.jpg'"`). This eliminates all dependency on
external cloud storage for personal photos. This is a future feature, not a requirement
for the initial MCP implementation.

---

## Shareable URL Construction

After batch marker creation, the MCP server (or `atlasphere_agent`) should return a
ready-to-share Atlasphere URL. The URL encodes the QuerySpec state needed to reproduce
the view: centered on the relevant location, filtered to the relevant tags.

Example for the walking tour scenario:
```
https://atlasphere.app/?lat=37.7975&lng=-122.4065&zoom=14&userIds=robbearman&tags=north-beach&tags=walking-tour
```

Example for the real estate scenario:
```
https://atlasphere.app/?lat=37.3861&lng=-122.0839&zoom=15&userIds=robbearman&tags=listing-123-main-st
```

This requires confirming that the QuerySpec supports `lat`, `lng`, and `zoom` as URL
parameters for centering the map view. If not, that is a prerequisite addition.

---

## Implementation Roadmap

The following phases are ordered by dependency, not necessarily by time.

### Phase 1: API Key Authentication

**Prerequisite for everything else.** No MCP tool can be called without a resolved,
authenticated user.

- Add `ApiKey` document model to MongoDB (hashed key, userId, label, createdAt,
  lastUsedAt)
- `POST /api/v1/auth/api-keys` — generates and returns a key once (never again)
- `DELETE /api/v1/auth/api-keys/{id}` — revokes
- `GET /api/v1/auth/api-keys` — lists metadata (no key values)
- Fastify `preHandler` hook that resolves `Authorization: ApiKey {key}` into
  `request.user`, parallel to the existing session-based auth
- Settings page in the web UI: "API Keys" section with generate + revoke UI

### Phase 2: MCP Route Handler and Core CRUD Tools

**The foundational MCP surface.**

- Add `@modelcontextprotocol/sdk` to `packages/api`
- Implement the route handler at `POST /mcp` using `StreamableHTTPServerTransport`
- Implement `AtlasContextStore` via `AsyncLocalStorage`
- Update `images` field in the Marker schema to a discriminated union:
  `{ type: 'url', url: string }` | `{ type: 'r2', r2Path: string, name: string }`
- Tool: `create_marker` — accepts both external image URLs and R2 asset references
  in the `images` field
- Tool: `update_marker`
- Tool: `delete_marker`
- Tool: `search_markers`
- Tool: `upload_image_from_url` (fetch → resize → presign → PUT → return r2Path) —
  explicit opt-in for R2 durability; not required when using stable external URLs
- Basic geocoding (Nominatim) used internally by tools that accept place names

End state: a user can connect Claude Code CLI or Cursor to Atlasphere and create, edit,
and find markers through conversation, referencing images by URL or copying them to R2
by choice. Claude Desktop users with repo access can connect via the stdio shim.

### Phase 3: `atlasphere_agent` and POI Discovery

**Unlocks the real estate and batch creation scenarios.**

- Integrate Overpass API for POI search (no key required, free tier sufficient)
- Implement `atlasphere_agent` tool: accepts natural language, orchestrates internally
- Internal orchestration: geocode address → search nearby POIs → source images →
  create markers → return shareable URL
- Define markdown templates for common marker categories (park, restaurant, school,
  coffee shop, grocery store) that produce consistent, high-quality content

End state: a broker can describe a listing in one sentence and receive a complete
neighborhood map in one reply.

### Phase 4: Operational Hardening

- Rate limiting on API key requests (100 creates/hour as a starting point)
- `lastUsedAt` tracking on API keys (for security audit visibility)
- Logging of MCP tool calls in Railway for observability
- `bulk_delete_by_tag` tool for listing lifecycle management (delete all markers for
  a sold listing)
- Documentation page on atlasphere.app explaining how to connect Claude Desktop

### Phase 5 (Future): Atlasphere-Native Image Library

- Image library web UI: upload personal photos to account R2 path
- `get_my_image(name)` MCP tool or `atlasphere_agent` awareness of the user's library
- OAuth upgrade path for clients that support it

---

## Design Constraints Summary

| Constraint | Decision |
|---|---|
| Near-zero cost | Remote integrated into existing Railway deployment; OSM/Nominatim for geodata (free) |
| Non-technical users | Remote MCP (URL config) for Claude Code/Cursor; Claude Desktop requires stdio shim today, npm bridge when users need it |
| No image generation | Removed from scope |
| No local filesystem | Remote MCP has no disk access; not needed — images come from public URLs |
| Two image modes | External URL (default, link rot accepted) or R2-backed (explicit opt-in via `upload_image_from_url`) |
| Context window cost | Minimal tool surface (6 tools); `atlasphere_agent` for multi-step |
| Auth.js limitations | API keys first; OAuth deferred |
| Core invariants preserved | Marker ID format, QuerySpec shape, URL-as-view all unchanged |
| Never proxy binary data | `upload_image_from_url` uses presign flow; server never buffers the final PUT |

