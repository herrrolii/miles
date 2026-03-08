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

1. Copy the contents of `consumer-example/widget/` into your website project's static assets so they are served as:
- `/widget/run-heatmap.js`
- `/widget/run-heatmap.css`
2. Paste this snippet into the target HTML page:

Example web component usage:

```html
<link rel="stylesheet" href="/widget/run-heatmap.css" />
<run-heatmap data-url="https://your-data-host.example/heatmap-data.json"></run-heatmap>
<script src="/widget/run-heatmap.js"></script>
```

You can check `consumer-example/` as a complete reference example.

## Automating Sync

If you run `npm run sync:strava` only once, your JSON will stay static.
If you want it to auto-update, use one of these approaches:

### Option A: Cron job (local machine / VPS / server)

Set up a cron job in whatever environment is running your producer code.
That cron job should run `npm run sync:strava` on a schedule so `heatmap-data.json` keeps updating from that host.
Make sure that hosted `heatmap-data.json` location is accessible by your website at runtime (same domain or an allowed cross-origin URL).

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

Then use the direct public file URL of that JSON in your website component `data-url`.
For GitHub, this is typically the file URL from the **Raw** view for `producer/dist/heatmap-data.json` (or your GitHub Pages file URL if you publish it there).
