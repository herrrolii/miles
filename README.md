# Miles

A GitHub-style contribution heatmap widget for your Strava running data.  
  
This repo is split into two parts:

1. `producer/`  
   Strava auth + sync + aggregation. Generates `producer/dist/heatmap-data.json`.
2. `consumer-example/`  
   Minimal website-side example showing how to render that JSON at runtime.

## Instructions

### 1. Create your Strava app

1. Go to <https://www.strava.com/settings/api>.
2. Create a new app.
3. Set callback domain to `localhost`.
4. Save your:
- `Client ID`
- `Client Secret`

### 2. Clone this repo and install dependencies

```bash
git clone <your-repo-url>
cd <repo-folder>
npm install
```

### 3. Configure environment variables

Create a local `.env` file:

```bash
cp producer/.env.example .env
```

Then fill in:

- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_REDIRECT_URI` (example: `http://localhost:4242/callback`)

### 4. Authorize Strava (one-time setup)

Run:

```bash
npm run authorize:strava
```

The script will:

1. Print an authorization URL.
2. Ask you to open it and approve access.
3. Ask you to paste back the `code` from the callback URL.

It will save private tokens to:

- `producer/data/strava-tokens.json`

### 5. Generate your heatmap JSON

Run:

```bash
npm run sync:strava
```

This creates/updates:

- `producer/dist/heatmap-data.json`

### 6. Use this JSON in your website

Your website should read the generated JSON at runtime.

Example web component usage:

```html
<link rel="stylesheet" href="/widget/run-heatmap.css" />
<run-heatmap data-url="https://your-data-host.example/heatmap-data.json"></run-heatmap>
<script src="/widget/run-heatmap.js"></script>
```

You can use `consumer-example/` as a reference for what to copy into your website repo.

## Automating Sync

### Option A: Cron job (local machine / VPS / server)

Run every 6 hours:

```cron
0 */6 * * * cd /path/to/repo && npm run sync:strava >> /tmp/running-heatmap.log 2>&1
```

### Option B: Public GitHub repo + GitHub Actions

1. Put the producer code in a public GitHub repo.
2. Keep the workflow file:
- `.github/workflows/sync-heatmap.yml`
3. In GitHub repo settings, add these secrets:
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_REFRESH_TOKEN`
4. Run the workflow once manually from the Actions tab.
5. The workflow will keep updating:
- `producer/dist/heatmap-data.json`

Then use the public URL of that JSON directly in your website component `data-url`.
