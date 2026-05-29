#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
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
    file: "scripts/latest-post.txt",
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--file") {
      args.file = argv[index + 1] || args.file;
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
    "  node scripts/append_threads_post_to_notion.js --file scripts/latest-post.txt",
    "",
    "Required environment:",
    "  NOTION_API_KEY",
    "  NOTION_PAGE_ID",
  ].join("\n");
}

function normalizeNotionId(id) {
  const compact = String(id || "").replace(/-/g, "").trim();
  if (!/^[0-9a-fA-F]{32}$/.test(compact)) {
    throw new Error("NOTION_PAGE_ID must be a 32-character Notion page or block id.");
  }

  return [
    compact.slice(0, 8),
    compact.slice(8, 12),
    compact.slice(12, 16),
    compact.slice(16, 20),
    compact.slice(20),
  ].join("-");
}

function kstTimestamp() {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
}

function richTextChunks(text, chunkSize = 1900) {
  const chars = [...text];
  const chunks = [];
  for (let index = 0; index < chars.length; index += chunkSize) {
    chunks.push(chars.slice(index, index + chunkSize).join(""));
  }
  return chunks;
}

function paragraph(content) {
  return {
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [{ type: "text", text: { content } }],
    },
  };
}

async function appendToNotion({ pageId, token, postText }) {
  const children = [
    {
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: [
          {
            type: "text",
            text: { content: `Threads 게시 기록 - ${kstTimestamp()}` },
          },
        ],
      },
    },
    ...richTextChunks(postText).map(paragraph),
    {
      object: "block",
      type: "divider",
      divider: {},
    },
  ];

  const response = await fetch(`${NOTION_API_BASE}/blocks/${pageId}/children`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify({ children }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.message || payload.error || response.statusText;
    throw new Error(`Notion API error (${response.status}): ${message}`);
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

  const token = process.env.NOTION_API_KEY;
  const rawPageId = process.env.NOTION_PAGE_ID;
  if (!token) throw new Error("Missing NOTION_API_KEY.");
  if (!rawPageId) throw new Error("Missing NOTION_PAGE_ID.");

  const postPath = path.resolve(args.file);
  const postText = fs.readFileSync(postPath, "utf8").trim();
  if (!postText) throw new Error(`Post file is empty: ${postPath}`);

  await appendToNotion({
    pageId: normalizeNotionId(rawPageId),
    token,
    postText,
  });

  console.log("Saved generated Threads post to Notion.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

