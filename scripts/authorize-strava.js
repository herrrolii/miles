#!/usr/bin/env node
const path = require("path");
const readline = require("readline");
const { loadEnvFile, requireEnv } = require("../src/utils/env");
const {
  createAuthorizationUrl,
  exchangeCodeForTokens,
  writeStoredTokens,
} = require("../src/strava/auth");

function getArgValue(name) {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);

  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1) return process.argv[index + 1];

  return null;
}

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  loadEnvFile(path.join(projectRoot, ".env"));

  const clientId = requireEnv("STRAVA_CLIENT_ID");
  const clientSecret = requireEnv("STRAVA_CLIENT_SECRET");
  const redirectUri = process.env.STRAVA_REDIRECT_URI || "http://localhost:4242/callback";
  const tokenFilePath = path.join(projectRoot, "data", "strava-tokens.json");

  const authorizationUrl = createAuthorizationUrl({
    clientId,
    redirectUri,
  });

  console.log("Open this URL in your browser and approve access:");
  console.log(authorizationUrl);
  console.log("");
  console.log("After approval, copy the `code` query parameter from the callback URL.");

  const codeFromArg = getArgValue("code");
  const code = codeFromArg || (await ask("Paste Strava code here: "));

  if (!code) {
    throw new Error("Missing authorization code.");
  }

  const tokenPayload = await exchangeCodeForTokens({
    clientId,
    clientSecret,
    code,
  });

  writeStoredTokens(tokenFilePath, tokenPayload);
  console.log(`Saved tokens to ${tokenFilePath}`);
  console.log("Authorization complete. You can now run: npm run sync:strava");
}

main().catch((error) => {
  console.error(`Authorization failed: ${error.message}`);
  process.exitCode = 1;
});
