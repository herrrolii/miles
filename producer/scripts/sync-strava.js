#!/usr/bin/env node
const path = require("path");
const { loadEnvFile, requireEnv } = require("../src/utils/env");
const { writeJsonFile } = require("../src/utils/file");
const { fetchRunActivities } = require("../src/strava/api");
const { buildHeatmapPayload } = require("../src/strava/transform");

async function main() {
  const producerRoot = path.resolve(__dirname, "..");
  const repoRoot = path.resolve(producerRoot, "..");
  loadEnvFile(path.join(repoRoot, ".env"));
  loadEnvFile(path.join(producerRoot, ".env"));

  const clientId = requireEnv("STRAVA_CLIENT_ID");
  const clientSecret = requireEnv("STRAVA_CLIENT_SECRET");
  const tokenFilePath = path.join(producerRoot, "data", "strava-tokens.json");
  const outputFilePath = path.join(producerRoot, "dist", "heatmap-data.json");

  console.log("Starting Strava sync...");
  const runs = await fetchRunActivities({
    clientId,
    clientSecret,
    tokenFilePath,
    days: 365,
  });

  const payload = buildHeatmapPayload(runs, { days: 365 });
  writeJsonFile(outputFilePath, payload);

  const activeDays = payload.days.filter((day) => day.count > 0).length;
  console.log(`Fetched ${runs.length} runs.`);
  console.log(`Updated ${outputFilePath} (${activeDays} active days in last 365).`);
}

main().catch((error) => {
  console.error(`Sync failed: ${error.message}`);
  process.exitCode = 1;
});
