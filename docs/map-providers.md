# Map Providers

Atlasphere supports two map providers: **Google Maps** (primary) and **Mapbox** (fallback).

---

## Provider selection

Priority order (highest to lowest):

1. `MAP_PROVIDER_OVERRIDE` env var — forces all map loads to a specific provider,
   ignoring everything else. Use this for immediate cutover without a code change.
2. `?mp=` URL param — per-session override by the user
3. Default: **Mapbox**

| Value | Provider |
|---|---|
| `google` / `mp=0` | Google Maps |
| `mapbox` / `mp=1` | Mapbox |

---

## Quota limits

| Provider | Free limit | Hard cap | Alert |
|---|---|---|---|
| Google Maps JS API | $200/month credit | 900 loads/month (budget cap set in GCP) | $1 budget alert in GCP |
| Mapbox | 50,000 map loads/month | None (charges begin after) | App-level alert at 80% (40k) |

Google Maps is capped at the GCP level — charges cannot exceed $1/month.
Mapbox has no hard cap; the app must alert before reaching 50k to avoid charges.

---

## Map load logging

Every map initialization must log a load event with the provider name.
These logs are used to track quota consumption.

- Log format: `{ event: "map_load", provider: "google" | "mapbox", timestamp: ISO string }`
- Logs should be queryable to produce a monthly count per provider
- Implementation TBD (Vercel log drain, or a lightweight counter in MongoDB)

### Mapbox threshold alerting

- Default alert threshold: **80%** of 50,000 = 40,000 loads/month
- Configurable via env var `MAPBOX_ALERT_THRESHOLD` (integer, number of loads)
- When threshold is crossed, alert mechanism TBD (email, Discord webhook, etc.)

---

## Env vars

| Var | Description |
|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps JS API key |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox public token |
| `MAP_PROVIDER_OVERRIDE` | `google` or `mapbox` — forces provider, overrides URL param |
| `MAPBOX_ALERT_THRESHOLD` | Map load count to trigger alert. Default: `40000` |
