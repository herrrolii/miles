# Miles

A GitHub-style contribution heatmap widget for your Strava running data.  
  
This repo is split into two parts:

1. `producer/`  
   Strava auth + sync + aggregation. Generates `producer/dist/heatmap-data.json`.
2. `consumer-example/`  
   Minimal website-side example showing how to render that JSON at runtime.

## Folder roles

```text
.
├── producer/
│   ├── .env.example
│   ├── data/                  # private token storage (gitignored)
│   ├── dist/
│   │   └── heatmap-data.json  # generated public data
│   ├── scripts/               # authorize + sync commands
│   └── src/                   # sync/aggregation implementation
└── consumer-example/
    ├── index.html
    ├── app.js
    ├── widget/
    │   ├── run-heatmap.js
    │   └── run-heatmap.css
    └── README.md
```

## Data producer flow

1. Authorize once with Strava
2. Run sync
3. Generate/update `producer/dist/heatmap-data.json`
4. Host that JSON publicly
5. Consumer website fetches and renders it at runtime

## Setup (producer)

1. Create Strava app: <https://www.strava.com/settings/api>
2. Set callback domain to `localhost`
3. Create `.env` (repo root or `producer/.env`):

```bash
cp producer/.env.example .env
```

4. Authorize:

```bash
npm run authorize:strava
```

5. Sync:

```bash
npm run sync:strava
```

Output:
- `producer/dist/heatmap-data.json`

## Mode A: GitHub repo + GitHub Actions

Included workflow:
- `.github/workflows/sync-heatmap.yml`

It runs every 6 hours, syncs Strava, and commits:
- `producer/dist/heatmap-data.json`

Required repo secrets:
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_REFRESH_TOKEN`

## Mode B: Run producer elsewhere (VPS/local/server)

Run cron in this repo:

```cron
0 */6 * * * cd /path/to/repo && npm run sync:strava >> /tmp/running-heatmap.log 2>&1
```

Then host `producer/dist/heatmap-data.json` anywhere (VPS static path, object storage, CDN, etc).

## Separation of concerns

- `producer/` = data producer
- consumer website = data consumer

Consumer site fetches JSON at runtime, so it does not need rebuilds for each run update.

## Consumer-side integration example

See:
- `consumer-example/`

That folder contains:
- website HTML
- small runtime JS
- widget files to place in website static assets

Edit `consumer-example/app.js` and set your real hosted JSON URL.
