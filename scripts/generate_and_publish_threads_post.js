#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const OPENAI_API_BASE = "https://api.openai.com/v1";
const THREADS_API_BASE = "https://graph.threads.net/v1.0";

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
    dryRun: false,
    outFile: "scripts/latest-post.txt",
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--out-file") {
      args.outFile = argv[index + 1] || args.outFile;
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
    "  node scripts/generate_and_publish_threads_post.js",
    "  node scripts/generate_and_publish_threads_post.js --dry-run",
    "",
    "Required environment:",
    "  OPENAI_API_KEY",
    "  THREADS_ACCESS_TOKEN, unless --dry-run is used",
    "",
    "Optional environment:",
    "  OPENAI_MODEL=gpt-5-mini",
    "  THREADS_MAX_CHARS=500",
  ].join("\n");
}

function kstTimestamp() {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date());
}

function kstDateParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    isoDate: `${values.year}-${values.month}-${values.day}`,
    year: values.year,
    weekday: values.weekday,
  };
}

function weekdayKo(weekday) {
  return {
    Monday: "월요일",
    Tuesday: "화요일",
    Wednesday: "수요일",
    Thursday: "목요일",
    Friday: "금요일",
    Saturday: "토요일",
    Sunday: "일요일",
  }[weekday] || weekday;
}

async function getKoreanHolidayContext(parts) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${parts.year}/KR`,
      { signal: controller.signal },
    );
    if (!response.ok) throw new Error(`holiday lookup ${response.status}`);

    const holidays = await response.json();
    const holiday = holidays.find((item) => item.date === parts.isoDate);
    return {
      isHoliday: Boolean(holiday),
      name: holiday?.localName || holiday?.name || "",
      lookup: "ok",
    };
  } catch (error) {
    return {
      isHoliday: false,
      name: "",
      lookup: `unavailable: ${error.message}`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function extractOutputText(response) {
  if (typeof response.output_text === "string") return response.output_text.trim();

  const chunks = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) chunks.push(content.text);
      if (content.type === "text" && content.text) chunks.push(content.text);
    }
  }

  return chunks.join("\n").trim();
}

async function postPrompt(extraInstruction = "") {
  const parts = kstDateParts();
  const holiday = await getKoreanHolidayContext(parts);
  const isWeekend = parts.weekday === "Saturday" || parts.weekday === "Sunday";
  const isMonday = parts.weekday === "Monday";

  let dayGuidance = "오늘은 감성, 응원, 긍정, 끌어당김의 힘을 자연스럽게 담는다.";
  if (holiday.isHoliday || isWeekend) {
    const holidayName = holiday.name ? ` (${holiday.name})` : "";
    dayGuidance = `오늘은 대한민국 기준 ${holiday.isHoliday ? `공휴일${holidayName}` : "주말"}이다. 쉼, 휴식, 회복의 중요성을 중심으로 쓴다.`;
  } else if (isMonday) {
    dayGuidance = "오늘은 월요일이다. 한주의 시작을 따뜻하게 응원하고, 좋은 흐름을 끌어당기는 글로 쓴다.";
  }

  return [
    `현재 한국 시간: ${kstTimestamp()}`,
    `오늘 날짜: ${parts.isoDate} ${weekdayKo(parts.weekday)}`,
    `대한민국 공휴일 조회: ${holiday.lookup}${holiday.name ? ` (${holiday.name})` : ""}`,
    `콘텐츠 방향: ${dayGuidance}`,
    "",
    "Threads에 바로 게시할 최종 글만 작성해.",
    "주제는 감성, 응원, 긍정, 끌어당김의 힘이다.",
    "읽는 사람이 오늘을 다시 믿고, 마음을 정돈하고, 좋은 방향으로 한 걸음 움직이고 싶어지는 분위기로 작성한다.",
    "구성은 반드시 다음 순서를 따른다:",
    "1. 위인 또는 잘 알려진 인물의 명언 한글 1줄, 출처/인물명 포함",
    "2. 빈 줄",
    "3. 같은 명언 영어 1줄, 출처/인물명 포함",
    "4. 빈 줄",
    "5. 관련 한국어 문장 3~5줄",
    "6. 한국어 해시태그 3~6개",
    "",
    "규칙:",
    "- 전체 글은 500자 이내로 작성한다.",
    "- 따옴표와 줄바꿈은 Threads에 자연스럽게 보이게 한다.",
    "- 따뜻하지만 과장되지 않게 쓴다.",
    "- '무조건 이루어진다'처럼 단정적인 약속은 피하고, 믿음과 행동의 균형을 둔다.",
    "- 특정 뉴스, 숫자, 기업 발표, 날짜는 쓰지 않는다.",
    "- 독자에게 죄책감을 주거나 불안을 자극하는 표현은 쓰지 않는다.",
    "- 설명, 제목, 검토 메모, 코드블록은 절대 붙이지 않는다.",
    extraInstruction,
  ]
    .filter(Boolean)
    .join("\n");
}

async function openaiResponse(input) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY.");

  const response = await fetch(`${OPENAI_API_BASE}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      input,
      store: false,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error?.message || response.statusText;
    throw new Error(`OpenAI API error (${response.status}): ${message}`);
  }

  const text = extractOutputText(payload);
  if (!text) throw new Error("OpenAI API returned no text output.");

  return text;
}

async function createPostText(maxChars) {
  let text = await openaiResponse(await postPrompt());
  if ([...text].length <= maxChars) return text;

  text = await openaiResponse(
    await postPrompt(`이전 출력이 너무 길었다. 반드시 ${maxChars}자 이내로 더 짧게 작성한다.`),
  );
  if ([...text].length > maxChars) {
    throw new Error(`Generated post is ${[...text].length} characters, above limit ${maxChars}.`);
  }

  return text;
}

async function threadsPost(endpoint, params) {
  const response = await fetch(`${THREADS_API_BASE}${endpoint}`, {
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

async function publishToThreads(text) {
  const token = process.env.THREADS_ACCESS_TOKEN;
  if (!token) throw new Error("Missing THREADS_ACCESS_TOKEN.");

  const container = await threadsPost("/me/threads", {
    media_type: "TEXT",
    text,
    access_token: token,
  });

  const published = await threadsPost("/me/threads_publish", {
    creation_id: container.id,
    access_token: token,
  });

  return published.id || container.id;
}

async function main() {
  loadDotEnv(path.resolve(".env"));

  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(usage());
    return;
  }

  const maxChars = Number.parseInt(process.env.THREADS_MAX_CHARS || "500", 10);
  const postText = await createPostText(maxChars);
  const outputPath = path.resolve(args.outFile);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${postText}\n`, "utf8");

  console.log(`Generated post (${[...postText].length}/${maxChars} chars).`);
  if (args.dryRun) {
    console.log("Dry run enabled. Post was generated but not published.");
    return;
  }

  const postId = await publishToThreads(postText);
  console.log(`Published Threads post id: ${postId}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
