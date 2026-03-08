# Website Consumer Example

This folder shows what a separate website repo might look like when consuming heatmap data from a data repo.

## What this example assumes

- You copy this folder's `widget/` files into your website static assets so they are served at:
  - `/widget/run-heatmap.js`
  - `/widget/run-heatmap.css`
- Your website fetches runtime data from a hosted JSON URL.

In `app.js`, replace:

- `https://your-data-host.example/heatmap-data.json`

with your real public endpoint (for example the hosted `producer/dist/heatmap-data.json` URL from your data repo).

## Why this is separate

This example is the **consumer side**.

- The data repo runs Strava sync and publishes JSON.
- The website repo fetches that JSON at runtime and renders it.

The website does not need rebuilds to get fresh data if it always fetches the latest JSON URL.
