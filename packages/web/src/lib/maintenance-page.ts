/**
 * Self-contained "on vacation" page served by middleware when
 * MAINTENANCE_MODE=true. Plain HTML (no React, no API calls) so it renders
 * even when the API is unreachable. Raw hex values are used here because
 * Tailwind tokens are not available outside the app bundle.
 */
export const MAINTENANCE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Atlasphere is on vacation</title>
<link rel="icon" href="/images/atlasphere-tab-icon.png">
<style>
  :root { --blue: #0094dd; --green: #93c572; --bg: #f8fafc; --fg: #0f172a; --muted: #475569; }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #0b1220; --fg: #e2e8f0; --muted: #94a3b8; }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center;
    padding: 24px 16px; background: var(--bg); color: var(--fg);
    font: 17px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  main { max-width: 34rem; text-align: center; }
  /* CSS globe: a tiled "continents" layer scrolls west-to-east (left to
     right) behind a circular mask; inset shadows give it a spherical look. */
  .globe {
    width: 96px; height: 96px; margin: 0 auto; border-radius: 50%;
    background-color: var(--blue);
    background-image:
      radial-gradient(ellipse 14% 22% at 12% 38%, var(--green) 96%, transparent 100%),
      radial-gradient(ellipse 8% 16% at 20% 70%, var(--green) 96%, transparent 100%),
      radial-gradient(ellipse 10% 18% at 46% 42%, var(--green) 96%, transparent 100%),
      radial-gradient(ellipse 7% 13% at 50% 68%, var(--green) 96%, transparent 100%),
      radial-gradient(ellipse 20% 16% at 74% 34%, var(--green) 96%, transparent 100%),
      radial-gradient(ellipse 7% 7% at 86% 74%, var(--green) 96%, transparent 100%);
    background-size: 192px 96px;
    background-repeat: repeat-x;
    box-shadow:
      inset -16px -10px 28px rgba(0, 0, 0, 0.45),
      inset 8px 6px 16px rgba(255, 255, 255, 0.25),
      0 6px 20px rgba(0, 0, 0, 0.15);
    animation: spin 16s linear infinite;
  }
  @keyframes spin { from { background-position: 0 0; } to { background-position: 192px 0; } }
  @media (prefers-reduced-motion: reduce) { .globe { animation: none; } }
  h1 { font-family: Georgia, "Times New Roman", serif; font-size: 2rem; line-height: 1.2; margin: 0.5rem 0 1rem; }
  h1 span { color: var(--blue); }
  p { color: var(--muted); margin: 0 0 1rem; }
  .postcard {
    margin-top: 1.5rem; padding: 1rem 1.25rem; border-left: 4px solid var(--green);
    text-align: left; font-family: Georgia, serif; font-style: italic; color: var(--fg);
    background: color-mix(in srgb, var(--green) 10%, transparent); border-radius: 0.375rem;
  }
</style>
</head>
<body>
<main>
  <div class="globe" aria-hidden="true"></div>
  <h1><span>Atlasphere</span> is on vacation.</h1>
  <p>Every coordinate on Earth is still right where we left it. We just stepped
  away from the map for a little while to tidy up some plumbing behind the scenes.</p>
  <p>Your markers are safe and sound. We'll be back exploring soon.</p>
  <div class="postcard">
    Wish you were here. The latitude is lovely, the longitude even better.
    Back before you can say &ldquo;flyTo.&rdquo;
  </div>
</main>
</body>
</html>`;
