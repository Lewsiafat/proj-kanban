# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # install deps (better-sqlite3 compiles native bindings)
npm start          # run server (node src/index.js)
npm run dev        # run with hot-reload (node --watch)
```

Open at `http://localhost:10023/proj-kanban/` (port and path come from `PORT` / `BASE_PATH`).

There is **no build step, no test suite, and no linter** — the frontend is served as-is and the backend is plain Node.

## Architecture

A single Express server (`src/index.js`, ~140 lines) serves both a REST API and a single static HTML page (`public/index.html`, ~650 lines, vanilla JS — no framework, no bundler). SQLite via `better-sqlite3`, file at `${DATA_DIR}/kanban.db`.

Data model: a **project** is a board column; a **card** is a status update inside it. Two tables (`projects`, `cards` with `ON DELETE CASCADE`), created inline at startup via `CREATE TABLE IF NOT EXISTS` — **there are no migrations**, so changing a column means editing the schema and recreating the DB file.

An AI-agent skill for this REST API ships in `.claude/skills/proj-kanban-api/` (`SKILL.md` operating guide + full per-endpoint contract in `references/api.md`); keep it in sync with `src/index.js` when endpoints change.

Other Claude Code helpers live in `.claude/` (committed with the repo):

- **Hooks** (`.claude/settings.json` → `.claude/hooks/*.sh`, fired on every `Edit|Write`): `check-src-syntax.sh` runs `node --check` on `src/index.js` — the only safety net given there are no tests/linter, surfacing syntax errors back to the agent; `remind-status-sync.sh` fires the three-places reminder below when an edit to `public/index.html` touches the status UI.
- **`api-skill-sync-reviewer`** (`.claude/agents/`): read-only subagent that checks the `proj-kanban-api` skill docs against `src/index.js`; run it after changing endpoints.
- **`reset-db`** (`.claude/skills/`, user-invoked): backs up and recreates the SQLite DB for the migration-less schema changes noted above.

### Things that will trip you up

- **`BASE_PATH` is load-bearing on both ends.** The server mounts the API at `/${BASE_PATH}/api` and serves the SPA at `/${BASE_PATH}`. The frontend derives its API base from `window.location.pathname` (`const BASE = ...; const API = BASE + '/api'`), so the app **only works when served under that path** — visiting `/` returns nothing. Keep server `BASE_PATH` and the URL you open in sync.

- **Column order is client-only.** The `projects.position` column exists and new projects get `MAX(position)+1`, but drag-and-drop reordering is **never persisted to the server** — it's saved to `localStorage` under `kanban-col-order` and re-applied client-side in `applyOrder()`. So column order is per-browser, and the DB `position` only reflects insertion order. Don't assume the server knows the visual order.

- **No partial updates.** Every mutation calls `load()`, which re-fetches all projects+cards (`GET /api/projects` returns projects with their cards nested) and re-renders the whole board via `innerHTML`. There's no client-side diffing or optimistic update.

- **Status is an open string.** Valid values are `active | pending | done | blocked | archived`, enforced only by the `<select>` and the label/CSS maps in the frontend — the DB and API accept any string. New statuses need updates in three places: the `<select>` options, the `labels` map in `cardHTML()`, and the `.status-*` CSS classes.

## Configuration

Env vars (see `.env.sample`; `.env` is gitignored and **not auto-loaded** — export vars or use a process manager): `PORT` (10023), `BASE_PATH` (`proj-kanban`), `DATA_DIR` (`./data`).
