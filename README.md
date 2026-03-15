# Miles

A GitHub-style contribution heatmap widget for your Strava running data.  

![Miles widget preview](https://github.com/user-attachments/assets/5c99b2c5-565a-49dc-b0c0-b4625ffe34eb)
  
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

- `STRAVA_CLIENT_ID` (from your Strava app page)
- `STRAVA_CLIENT_SECRET` (from your Strava app page)
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

- `producer/data/strava-tokens.json` (gitignored)

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
2. Keep both files in the same folder. The widget JS will automatically load `run-heatmap.css` into the component's Shadow DOM.
3. Paste this snippet into the target HTML page:

Example web component usage:

```html
<run-heatmap
  data-url="https://your-data-host.example/heatmap-data.json"
  theme="light"
  unit="km"
></run-heatmap>
<script src="/widget/run-heatmap.js"></script>
```

Theme options:

- `theme="light"`
- `theme="dark"`

Unit options:

- `unit="km"`
- `unit="mi"`

If you want to serve `run-heatmap.css` from a different URL than the folder that serves `run-heatmap.js`, set an explicit override with the `css-href` attribute:

```html
<run-heatmap
  data-url="https://your-data-host.example/heatmap-data.json"
  theme="dark"
  unit="mi"
  css-href="/assets/widgets/run-heatmap.css"
></run-heatmap>
<script src="/assets/widgets/run-heatmap.js"></script>
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
3. In GitHub repo settings, add these **Repository Secrets**:
- `STRAVA_CLIENT_ID` (same value you put in `.env`, from your Strava app page)
- `STRAVA_CLIENT_SECRET` (same value you put in `.env`, from your Strava app page)
- `STRAVA_REFRESH_TOKEN` (from `producer/data/strava-tokens.json`, generated after authorization; this file is gitignored)
4. Run the workflow once manually from the Actions tab.
5. The workflow will keep updating:
- `producer/dist/heatmap-data.json`

Then use the direct public file URL of that JSON in your website component `data-url`.
For GitHub, this is typically the file URL from the **Raw** view for `producer/dist/heatmap-data.json` (or your GitHub Pages file URL if you publish it there).
