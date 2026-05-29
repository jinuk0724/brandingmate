#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const API_BASE = "https://graph.threads.net/v1.0";

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    text: "",
    file: "",
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--text") {
      args.text = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--file") {
      args.file = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/publish_threads_post.js --file scripts/sample-post.txt",
    '  node scripts/publish_threads_post.js --text "Post text"',
    "  node scripts/publish_threads_post.js --file scripts/sample-post.txt --dry-run",
    "",
    "Required:",
    "  THREADS_ACCESS_TOKEN in .env or the environment",
  ].join("\n");
}

function readPostText(args) {
  if (args.text) return args.text;
  if (args.file) {
    return fs.readFileSync(path.resolve(args.file), "utf8").trim();
  }

  if (!process.stdin.isTTY) {
    return fs.readFileSync(0, "utf8").trim();
  }

  return "";
}

async function threadsPost(endpoint, params) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error?.message || response.statusText;
    throw new Error(`Threads API error (${response.status}): ${message}`);
  }

  return payload;
}

async function main() {
  loadDotEnv(path.resolve(".env"));

  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(usage());
    return;
  }

  const token = process.env.THREADS_ACCESS_TOKEN;
  const text = readPostText(args);

  if (!text) {
    throw new Error("Missing post text. Pass --file, --text, or pipe text through stdin.");
  }

  if (args.dryRun) {
    console.log("Dry run OK. This text would be posted to Threads:");
    console.log("");
    console.log(text);
    return;
  }

  if (!token) {
    throw new Error("Missing THREADS_ACCESS_TOKEN. Add it to .env or your environment.");
  }

  const container = await threadsPost("/me/threads", {
    media_type: "TEXT",
    text,
    access_token: token,
  });

  const published = await threadsPost("/me/threads_publish", {
    creation_id: container.id,
    access_token: token,
  });

  console.log(`Published Threads post id: ${published.id || container.id}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
