# QuerySpec

QuerySpec is the search/filter model for Atlasphere. Any combination of its
parameters can be used together. All parameters serialize to URL query strings,
making every search result a shareable link.

---

## Parameters

| Param | Type | Description |
|---|---|---|
| `userIds` | `string[]` | Filter by one or more author handles |
| `tags` | `string[]` | Filter by tags |
| `allTags` | `boolean` | If true, markers must match ALL tags (AND); if false, any tag (OR). Default: false |
| `markerIds` | `string[]` | Fetch specific markers by ID |
| `near.lat` | `number` | Latitude for proximity search |
| `near.lng` | `number` | Longitude for proximity search |
| `near.distance` | `number` | Radius in meters. Default: 40,000 (40km) |
| `dateRange.start` | `string` | ISO date string, range start |
| `dateRange.end` | `string` | ISO date string, range end |
| `dateRange.usePosttime` | `boolean` | If true, filter on `posttime`; if false, filter on `datetime`. Default: false |

---

## URL serialization

QuerySpec parameters map directly to URL query params. Arrays use repeated keys:

```
?userIds=robbearman&userIds=janesmith
?tags=hiking&tags=trails&allTags=true
?near.lat=37.3861&near.lng=-122.0839&near.distance=10000
?dateRange.start=2024-01-01&dateRange.end=2024-12-31
```

A combined example:
```
/?userIds=robbearman&tags=california&near.lat=37.3861&near.lng=-122.0839
```

---

## Default view

The homepage default view is driven by env vars:

| Env var | Description |
|---|---|
| `DEFAULT_QUERY_USERIDS` | Comma-separated userIds to show by default |
| `DEFAULT_QUERY_TAGS` | Comma-separated tags to show by default |

If both are empty, the map shows all public markers.

---

## API usage

`GET /api/v1/markers` accepts all QuerySpec params as query string parameters.

The Zod schema for QuerySpec lives in `/packages/shared/src/queryspec.ts` and is
used by both the API (validation) and the frontend (URL serialization/deserialization).
