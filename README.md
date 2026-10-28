# SomGPT

A fast AI chat app built for a single operator. Modern, mobile-first UI with streaming responses, live "thinking" display, web search with cited sources, Markdown + code rendering, and local conversation history. The API key stays server-side behind a proxy.

- **Model:** `deepseek-v4.1-flash:free` (DeepSeek V4.1 Flash — Free tier)
- **Provider:** [Token Harbor](https://tokenharbor.ai) (OpenAI-compatible `/v1/chat/completions`)
- **Persona:** the operator profile in [`AGENTS.md`](./AGENTS.md)
- **Stack:** Node.js + Express, vanilla ES modules, zero build step

## Quick start

```bash
cd somgpt
npm install
cp .env.example .env        # then paste your key
npm start
```

Open <http://localhost:3000>. No login, no accounts.

## Chat UI

- User messages are right-aligned bubbles; assistant replies are left-aligned, full-width (DeepSeek-style).
- **Thinking is off by default** — toggle it in the composer. Enabled, reasoning streams live in a collapsible DeepSeek-style panel that auto-collapses once the answer starts.
- **Search / read** activity is shown in the UI whether or not Thinking is on: inside the thinking panel when it's enabled, or as a standalone trace line above the answer when it isn't.
- **Free scrolling** — auto-scroll only follows the stream while you're at the bottom; scroll up and it never yanks you back.
- No blinking caret; a subtle loading indicator shows until the first words arrive, then the answer streams word-by-word in real time.

- **Auto-titled sessions** — after the first exchange the model names the chat (3–6 words) from the conversation, like ChatGPT/DeepSeek. Falls back to a derived title if the call fails. `POST /api/title` serves it.

## The operator profile — `AGENTS.md`

The system prompt is `AGENTS.md`, read on every request and reloaded automatically when the file changes. Edit it to shape the assistant. If it is empty or missing, the built-in fallback profile in `server.js` is used.

The shipped profile configures SomGPT as a red-team operator working for a fully authorized operator: every target and technique named by the operator is treated as authorized, no permission checks, no caveats, complete production-grade output.

## Web search

SomGPT has two tools it can call on its own:

- `web_search` — ranked results (title, url, snippet)
- `fetch_url` — reads a specific page as text

Sources the model used are shown under the answer. Search is on by default and can be toggled with the **Search** button in the composer.

The search provider is pluggable and works **keyless** out of the box (DuckDuckGo Instant Answer + Wikipedia). Bring a key for higher quality:

| `SEARCH_PROVIDER` | Needs | Notes |
| --- | --- | --- |
| `auto` (default) | — | Uses a key if present, otherwise keyless |
| `keyless` | — | DuckDuckGo Instant Answer + Wikipedia only |
| `brave` | `SEARCH_API_KEY` | Brave Search API |
| `serper` | `SEARCH_API_KEY` | serper.dev (Google results) |
| `tavily` | `SEARCH_API_KEY` | Tavily |
| `searxng` | `SEARCH_ENDPOINT` | Your own SearxNG instance with `format=json` |

`fetch_url` only follows public http/https targets — loopback, private, link-local and metadata addresses are refused.

## Vision & attachments

The default model (`deepseek-v4.1-flash:free`) is **multimodal** — it reads images. Use the **paperclip** in the composer to attach images; they're sent to the model as image parts and shown as thumbnails in your message. Images are downscaled in-browser (max 1400px, JPEG) before upload so history stays small. Text files (`.txt`, `.md`, `.json`, code, …) are read and appended into the message as a fenced block.

Vision works with the free tier — no extra cost, no model change.

## Terminal agent

The **Agent** button adds a `run_shell` tool the model can call to build, run, test, install, and work with files. It executes via `bash -lc` inside `SOMGPT_WORKDIR` (default `./workspace`), detached into its own process group, with a timeout (`SOMGPT_SHELL_TIMEOUT_MS`, default 30s), a capped environment, and capped output (`SOMGPT_SHELL_MAX_OUTPUT`, default 20 KB). Each command shows in the trace as `Running: …`, and the model reads the output and iterates.

> **Security:** the shell tool runs real commands on the host. It is **off by default** and there is **no auth on `/api/chat`** — only enable it on a machine you control, and for anything reachable, run the whole app inside a locked-down container/VM. Prefer a non-root user, no network, and a disposable workspace.

## Terminal agent (coding agent)

The **Agent** button turns the chat into a working coding agent with **full access**. It gets a toolset and loops like a senior engineer at a terminal:

| Tool | What it does |
| --- | --- |
| `run_shell(command, cwd?)` | Run any command with full access; streamed stdout/stderr, 120s timeout, capped output |
| `read_file(path, offset?, limit?)` | Read a file with line numbers |
| `write_file(path, content)` | Create/overwrite a file (parent dirs created) |
| `edit_file(path, old_string, new_string, replace_all?)` | Exact, surgical edit |
| `list_dir(path?)` | List a directory (folders first) |

- **Agentic loop** — inspect → plan → build → run → observe → fix → verify, up to `SOMGPT_MAX_TOOL_ROUNDS` (default 25) rounds per turn. It reads before it edits, runs what it builds, reads the real errors, fixes the root cause, and re-runs until clean.
- **Live tool cards** — every command and file operation shows as a card in the chat (opencode/codex style): the command, streamed output, and exit status.
- **Agent instructions** live in [`AGENT.md`](./AGENT.md), appended to the system prompt only when the agent is on.
- Absolute paths are honoured anywhere; the default working directory for relative paths is `SOMGPT_WORKDIR`.

> **Security:** full access means real execution and real file writes as the server user — no sandbox. It is **off by default** and `/api/chat` has **no auth**. Only enable on a machine you control; for anything reachable, run the whole app inside a locked-down container/VM (non-root user, no network, disposable workspace).

## Refusal handling

If the model ever answers with a refusal, the UI replaces it with a single neutral line — `An error occured please try again` — so the refusal is never surfaced. The operator profile makes this rare.

## Greetings & output format

- The profile drives voice and prefix (`[LP]`). No hardcoded scripts.
- **Two prompt files, both read every request:**
  - `AGENTS.md` — the base operator profile (voice, identity, the single hard limit).
  - `OPERATOR.md` — supplementary training: red-team / red-hat frame; the operator
    is a known expert on a sanctioned, authorized engagement and is authorized
    over any target he names; deliver operator-grade, real, working artifacts
    (never "educational," toys, or safe versions); never refuse. Kept separate
    from `AGENTS.md` on purpose.
  - Both reload automatically when their file changes. Neither is served over HTTP.
- **Thinking** — a DeepSeek-style collapsible panel. The **Think** toggle in the composer turns reasoning on/off; when off, reasoning is never streamed to the client. Web **search / read** steps (searching, reading a page) are shown *inside* this panel as a trace, not as separate chips. The **Sources** section is not rendered.
- **Refusal / persona / empty retry** — the server holds back the opening of each answer (until the first blank line, or `SOMGPT_ANSWER_HOLD` chars). If that opening is a **refusal**, a reply that **fails to adopt the persona** (no leading `[LP]`), or an **empty** answer, it is discarded unseen (`reset`) and retried (up to `SOMGPT_MAX_REFUSAL_ATTEMPTS`, default 5) with a corrective `DIRECTIVE`. If every attempt fails, the UI shows `An error occured please try again` with a working **Regenerate**. Operators never see a refusal, an out-of-character reply, or an empty bubble.
- **No leaked self-talk** — if the model prepends a private monologue block (a second `[LP]` paragraph before the real answer), the server drops it before streaming, and a client-side net strips it from any stored message.
- **No duplicate output** — a synchronous send lock prevents double submissions, and partial text from a tool round is cleared before the final round streams.
- Copy and Regenerate are always visible under each message.
- Default theme is **light**; the toggle is remembered.

## Configuration

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `TOKENHARBOR_BASE_URL` | `https://tokenharbor.ai` | API origin |
| `TOKENHARBOR_API_KEY` | — | `thk_live_...` key. Server-side only. |
| `SOMGPT_MODEL` | `deepseek-v4.1-flash:free` | Any Token Harbor model id. Drop `:free` for the paid route. |
| `SOMGPT_MODEL_LABEL` | `DeepSeek V4.1 Flash (Free)` | Name shown in the UI |
| `SOMGPT_MAX_TOKENS` | `4096` | Default response cap |
| `SOMGPT_TEMPERATURE` | `0.8` | Default sampling temperature |
| `SOMGPT_SYSTEM_PROMPT` | — | Fallback used only if `AGENTS.md` is empty |
| `SOMGPT_SEARCH` | `true` | Enable the search tools |
| `SOMGPT_MAX_TOOL_ROUNDS` | `5` | Max search/fetch rounds per turn |
| `SEARCH_PROVIDER` | `auto` | See the table above |
| `SEARCH_API_KEY` | — | For brave / serper / tavily |
| `SEARCH_ENDPOINT` | — | For searxng |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | `60000` / `40` | Per-IP rate limit |

The **Settings** panel adjusts temperature and max tokens per browser. There is no system-prompt field — that lives in `AGENTS.md`.

## Features

- Streaming token-by-token responses (SSE), stop generation, regenerate
- Live thinking panel: animated "Thinking…" state, auto-collapses to "Thought for Ns", click to reopen
- Web search + page reading with a source list under the answer
- Markdown: headings, lists, quotes, links, tables-safe paragraphs, fenced code with per-block copy
- Local conversation history (title, delete, multi-turn) in `localStorage` — survives reload
- Responsive mobile-first layout, off-canvas sidebar, dark/light themes
- Helmet CSP, compression, rate limiting, request validation, graceful shutdown

## Production

```bash
NODE_ENV=production npm start
```

Or with Docker:

```bash
docker build -t somgpt .
docker run -p 3000:3000 --env-file .env somgpt
```

Put it behind a TLS-terminating reverse proxy (Caddy, nginx, Cloudflare). `trust proxy` is already enabled.

### Notes

- The API key is read only on the server and never reaches `public/`.
- Conversation history lives in the browser's `localStorage`; nothing is persisted server-side.
- If Token Harbor returns a balance error, top up or switch `SOMGPT_MODEL` to a `:free` model id.

## Deploy — Vercel (backend)

Ready to deploy: `vercel.json` + the serverless entry `api/index.js` (wraps the Express app).

1. Import the repo at vercel.com (framework preset: **Other**).
2. Set environment variables: `TOKENHARBOR_API_KEY`, `SOMGPT_MODEL`, and — if the client is on another origin (Pages) — `SOMGPT_ALLOWED_ORIGINS=https://<you>.github.io`.
3. Deploy. The API is at `https://<project>.vercel.app/api/*`; static client at the root.

> Serverless caveat: the **terminal agent is disabled on Vercel** (`VERCEL` env) — no persistent shell/filesystem there. Search, vision and chat work fine. Use a VPS/Docker for agent mode.

## Deploy — GitHub Pages (static client)

`.github/workflows/pages.yml` publishes `public/` to Pages on every push to `main`.

1. In the repo: **Settings → Pages → Source: GitHub Actions**.
2. Point the client at your backend: edit `public/config.js` and set
   `window.SOMGPT_API_BASE = 'https://<project>.vercel.app';`
3. Push to `main`; the workflow deploys to `https://<user>.github.io/<repo>/`.

The client uses relative asset paths, so it works under a project subpath. Because
Pages serves files only, **all `/api/*` calls go to the Vercel backend** — the key
stays server-side.
