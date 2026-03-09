const {
  readStoredTokens,
  refreshAccessToken,
  tokenExpiresSoon,
  writeStoredTokens,
} = require("./auth");

const STRAVA_API_BASE = "https://www.strava.com/api/v3";

function ensureFetch() {
  if (typeof fetch !== "function") {
    throw new Error("Global fetch is unavailable. Use Node.js 18+.");
  }
}

function getAfterEpochSeconds(days) {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  now.setUTCDate(now.getUTCDate() - (days - 1));
  return Math.floor(now.getTime() / 1000);
}

async function fetchActivitiesPage({ accessToken, page, perPage, afterEpochSeconds }) {
  ensureFetch();

  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  if (Number.isFinite(afterEpochSeconds) && afterEpochSeconds > 0) {
    params.set("after", String(afterEpochSeconds));
  }

  const response = await fetch(`${STRAVA_API_BASE}/athlete/activities?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.message || "Failed to fetch activities";
    throw new Error(`${message} (status ${response.status})`);
  }

  if (!Array.isArray(payload)) {
    throw new Error("Unexpected activities payload from Strava API.");
  }

  return payload;
}

async function ensureFreshTokens({ clientId, clientSecret, tokenFilePath }) {
  const storedTokens = readStoredTokens(tokenFilePath);
  if (!storedTokens) {
    throw new Error("Missing token file. Run `npm run authorize:strava` first.");
  }

  if (!storedTokens.refresh_token) {
    throw new Error("Stored token file is missing refresh_token.");
  }

  if (!tokenExpiresSoon(storedTokens)) {
    return storedTokens;
  }

  const refreshed = await refreshAccessToken({
    clientId,
    clientSecret,
    refreshToken: storedTokens.refresh_token,
  });

  writeStoredTokens(tokenFilePath, refreshed);
  return refreshed;
}

async function fetchAllActivities({ accessToken, afterEpochSeconds, perPage = 200 }) {
  const activities = [];
  let page = 1;

  while (true) {
    const pageItems = await fetchActivitiesPage({
      accessToken,
      page,
      perPage,
      afterEpochSeconds,
    });

    activities.push(...pageItems);

    if (pageItems.length < perPage) {
      break;
    }

    page += 1;
  }

  return activities;
}

function filterRunningActivities(activities) {
  return activities.filter((activity) => activity?.type === "Run");
}

async function fetchRunActivities({ clientId, clientSecret, tokenFilePath, days = 365 }) {
  const tokens = await ensureFreshTokens({ clientId, clientSecret, tokenFilePath });
  const afterEpochSeconds = Number.isFinite(days) && days > 0 ? getAfterEpochSeconds(days) : null;
  const activities = await fetchAllActivities({
    accessToken: tokens.access_token,
    afterEpochSeconds,
  });

  return filterRunningActivities(activities);
}

module.exports = {
  fetchRunActivities,
};
