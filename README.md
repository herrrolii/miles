# Running Heatmap (Strava, self-hosted)

Generate a GitHub-style running contribution heatmap from your own Strava data.

This project has two parts:

- private sync scripts that pull Strava activities and write derived daily stats
- public widget files that render the heatmap from JSON

## What this stores

- Private (gitignored): `data/strava-tokens.json`
- Public (safe derived output): `public/heatmap-data.json`

No raw activity stream is published. The public JSON only includes per-day aggregates.

## 1. Strava app setup

1. Create a Strava developer app: <https://www.strava.com/settings/api>
2. Set callback domain to `localhost` for local use.
3. Put credentials in `.env`:

```bash
cp .env.example .env
```

Required values:

- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_REDIRECT_URI` (example: `http://localhost:4242/callback`)

## 2. Authorize once

```bash
npm run authorize:strava
```

The script prints an authorization URL.

1. Open it in your browser
2. Approve access
3. Copy the `code` query param from the callback URL
4. Paste it back into the terminal

Tokens are saved to `data/strava-tokens.json`.

## 3. Sync manually

```bash
npm run sync:strava
```

This refreshes tokens when needed, fetches running activities from the last 365 days, aggregates by day, and writes:

- `public/heatmap-data.json`

## 4. Embed widget

Include these files:

- `public/widget/run-heatmap.css`
- `public/widget/run-heatmap.js`

Then embed:

```html
<run-heatmap data-url="/heatmap-data.json" theme="light"></run-heatmap>
```

Or mount manually:

```html
<div id="heatmap"></div>
<script>
  RunHeatmap.mount(document.getElementById("heatmap"), {
    dataUrl: "/heatmap-data.json",
    theme: "light"
  });
</script>
```

See [examples/embed-basic.html](examples/embed-basic.html).

## 5. Cron example

Run sync every 6 hours:

```cron
0 */6 * * * cd /path/to/running-heatmap && npm run sync:strava >> /tmp/running-heatmap.log 2>&1
```

The widget only reads `public/heatmap-data.json`, so no runtime backend is needed for display.
