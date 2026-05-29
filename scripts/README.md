# Threads publishing

This folder contains a small publisher for the Threads API.
The current automated content theme is emotional encouragement, positivity,
and the power of attraction.
On Mondays, the generated post emphasizes encouragement for the start of the
week. On Korean public holidays and weekends, it emphasizes rest, recovery, and
the value of pausing.

## Setup

Create a `.env` file in the project root:

```text
THREADS_ACCESS_TOKEN=your_threads_access_token
```

The `.env` file is ignored by Git.

## Dry run

```powershell
& 'C:\Users\chaji\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' scripts/publish_threads_post.js --file scripts/sample-post.txt --dry-run
```

## Publish

```powershell
& 'C:\Users\chaji\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' scripts/publish_threads_post.js --file scripts/sample-post.txt
```

## Cloud automation with GitHub Actions

The cloud workflow lives at `.github/workflows/threads-auto-publish.yml`.
It runs at 09:00, 16:00, and 20:00 Asia/Seoul, even when the local PC is off.

Add these GitHub repository secrets:

```text
OPENAI_API_KEY
THREADS_ACCESS_TOKEN
NOTION_API_KEY
```

Optional repository variable:

```text
OPENAI_MODEL=gpt-5-mini
```

Use the workflow's manual run button with `dry_run=true` first. Set
`dry_run=false` only when the generated post looks correct and the Threads token
is valid.

The script checks Korean public holidays at runtime through Nager.Date:

```text
https://date.nager.at/api/v3/PublicHolidays/{year}/KR
```

When `NOTION_API_KEY` is present, the workflow appends the generated Threads
post to this Notion page after a successful publish:

```text
f8f17c58bd2c4f97a4e610b92e80837a
```

Share the Notion page with your Notion integration first, or the API will return
a permissions error.
