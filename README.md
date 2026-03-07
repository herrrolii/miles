# Running Heatmap (Strava, self-hosted)

Generate a GitHub-style running contribution heatmap from your own Strava data.

## How it works

- Private sync script pulls Strava runs and writes daily aggregates.
- Public widget renders from JSON.

Files:

- Private token storage: `data/strava-tokens.json` (gitignored)
- Public derived data: `docs/heatmap-data.json`
- Widget assets: `docs/widget/run-heatmap.js` and `docs/widget/run-heatmap.css`

## Local setup (one time)

1. Create a Strava app: <https://www.strava.com/settings/api>
2. Set callback domain to `localhost`
3. Create `.env`:

```bash
cp .env.example .env
```

Required `.env` vars:

- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_REDIRECT_URI` (example: `http://localhost:4242/callback`)

4. Authorize once:

```bash
npm run authorize:strava
```

5. Sync once:

```bash
npm run sync:strava
```

## Easiest auto-update flow (recommended)

Use this repo (or your website repo) with the included workflow:

- `.github/workflows/sync-heatmap.yml`

It runs every 6 hours, updates `docs/heatmap-data.json`, and commits it automatically.

### One-time setup

1. Run local authorize once and get refresh token:

```bash
node -p "require('./data/strava-tokens.json').refresh_token"
```

2. In GitHub repo settings, add these Actions secrets:
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_REFRESH_TOKEN`

3. Trigger workflow once manually (`Actions` -> `Sync Strava Heatmap` -> `Run workflow`).

After that, it auto-updates on schedule.

## Embed snippet

```html
<link rel="stylesheet" href="/widget/run-heatmap.css" />
<run-heatmap data-url="/heatmap-data.json" theme="light"></run-heatmap>
<script src="/widget/run-heatmap.js"></script>
```

Manual mount option:

```html
<div id="heatmap"></div>
<script src="/widget/run-heatmap.js"></script>
<script>
  RunHeatmap.mount(document.getElementById("heatmap"), {
    dataUrl: "/heatmap-data.json",
    theme: "light"
  });
</script>
```

See:

- `examples/embed-basic.html` (basic usage)
- `docs/index.html` (public demo page using `docs/heatmap-data.json`)

## GitHub Pages demo for this repo

`docs/index.html` renders the real tracked file: `docs/heatmap-data.json`.

To publish:

1. `Settings` -> `Pages`
2. Source: `Deploy from a branch`
3. Branch: `main` and folder `/docs`

## Hosting notes

- Static hosting is enough for rendering.
- Strava sync still needs a private scheduled runner (GitHub Actions, cron on VPS, etc.).
- For Vercel/Cloudflare/Netlify with GitHub integration, workflow commits trigger redeploy automatically.
