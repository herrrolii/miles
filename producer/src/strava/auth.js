const fs = require("fs");
const { readJsonFile, writeJsonFile } = require("../utils/file");

const STRAVA_OAUTH_BASE = "https://www.strava.com/oauth";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

function ensureFetch() {
  if (typeof fetch !== "function") {
    throw new Error("Global fetch is unavailable. Use Node.js 18+.");
  }
}

function createAuthorizationUrl({
  clientId,
  redirectUri,
  scope = "read,activity:read_all",
  approvalPrompt = "auto",
}) {
  const params = new URLSearchParams({
    client_id: String(clientId),
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: approvalPrompt,
    scope,
  });

  return `${STRAVA_OAUTH_BASE}/authorize?${params.toString()}`;
}

async function postTokenRequest(body) {
  ensureFetch();
  const response = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.message || "Failed token request";
    throw new Error(`${message} (status ${response.status})`);
  }

  return payload;
}

async function exchangeCodeForTokens({ clientId, clientSecret, code }) {
  return postTokenRequest({
    client_id: String(clientId),
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
  });
}

async function refreshAccessToken({ clientId, clientSecret, refreshToken }) {
  return postTokenRequest({
    client_id: String(clientId),
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
}

function readStoredTokens(tokenFilePath) {
  if (!fs.existsSync(tokenFilePath)) {
    return null;
  }
  return readJsonFile(tokenFilePath);
}

function writeStoredTokens(tokenFilePath, tokenPayload) {
  writeJsonFile(tokenFilePath, {
    ...tokenPayload,
    updated_at: new Date().toISOString(),
  });
}

function tokenExpiresSoon(tokenPayload, skewSeconds = 60) {
  const expiresAt = Number(tokenPayload?.expires_at || 0);
  if (!expiresAt) return true;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return expiresAt <= nowSeconds + skewSeconds;
}

module.exports = {
  createAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  readStoredTokens,
  writeStoredTokens,
  tokenExpiresSoon,
};
