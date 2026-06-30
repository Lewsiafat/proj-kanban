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

A single Express server (`src/index.js`, ~140 lines) serves both a REST API and a single static HTML page (`public/index.html`, ~1060 lines, vanilla JS — no framework, no bundler). SQLite via `better-sqlite3`, file at `${DATA_DIR}/kanban.db`. The frontend has **two board views** toggled in the header (persisted to `localStorage`): the **project view** (columns = projects) and the **status view** (columns = the 5 statuses, cards grouped across all projects).

Data model: a **project** is a board column; a **card** is a status update inside it. Two tables (`projects`, `cards` with `ON DELETE CASCADE`), created inline at startup via `CREATE TABLE IF NOT EXISTS` — **there are no migrations**, so changing a column means editing the schema and recreating the DB file.

An AI-agent skill for this REST API ships as a **Claude Code plugin** in `plugins/proj-kanban-api/` (skill at `skills/proj-kanban-api/` — `SKILL.md` operating guide + full per-endpoint contract in `references/api.md`); keep it in sync with `src/index.js` when endpoints change. This repo doubles as the plugin's marketplace (`.claude-plugin/marketplace.json`). **The skill no longer lives under `.claude/skills/`, so it is not auto-loaded while you work in this repo — install it first: `/plugin marketplace add .` then `/plugin install proj-kanban-api@proj-kanban`.**

Other Claude Code helpers live in `.claude/` (committed with the repo):

- **Hooks** (`.claude/settings.json` → `.claude/hooks/*.sh`, fired on every `Edit|Write`): `check-src-syntax.sh` runs `node --check` on `src/index.js` — the only safety net given there are no tests/linter, surfacing syntax errors back to the agent; `remind-status-sync.sh` fires the three-places reminder below when an edit to `public/index.html` touches the status UI.
- **`api-skill-sync-reviewer`** (`.claude/agents/`): read-only subagent that checks the `proj-kanban-api` skill docs against `src/index.js`; run it after changing endpoints.
- **`reset-db`** (`.claude/skills/`, user-invoked): backs up and recreates the SQLite DB for the migration-less schema changes noted above.
- **`release`** (`.claude/skills/`, user-invoked): project-local release skill — bumps `package.json` and the plugin's `plugin.json` to the same version, updates the bilingual `CHANGELOG`, commits (staging `.claude/` and `plugins/`), tags `vX.Y.Z`, and pushes. Supersedes the generic global `release` skill for this repo.

### Things that will trip you up

- **`BASE_PATH` is load-bearing on both ends.** The server mounts the API at `/${BASE_PATH}/api` and serves the SPA at `/${BASE_PATH}`. The frontend derives its API base from `window.location.pathname` (`const BASE = ...; const API = BASE + '/api'`), so the app **only works when served under that path** — visiting `/` returns nothing. Keep server `BASE_PATH` and the URL you open in sync.

- **Column order is client-only.** The `projects.position` column exists and new projects get `MAX(position)+1`, but drag-and-drop reordering is **never persisted to the server** — it's saved to `localStorage` under `kanban-col-order` and re-applied client-side in `applyOrder()`. So column order is per-browser, and the DB `position` only reflects insertion order. Don't assume the server knows the visual order.

- **No partial updates.** Every mutation calls `load()`, which re-fetches all projects+cards (`GET /api/projects` returns projects with their cards nested) and re-renders the whole board via `innerHTML`. There's no client-side diffing or optimistic update.

- **Two views, two of everything.** `render()` dispatches on `currentView` (persisted under `kanban-view`) to `renderProjectView()` or `renderStatusView()`. The two views run **parallel, isolated** subsystems: separate filters (project view = status chips `kanban-status-filter`; status view = project chips `kanban-project-filter` — orthogonal, never overwrite each other) and separate drag systems (project view = column reorder via `initDragDrop`/`dragSrcIdx`; status view = card drag to change status via `initStatusDragDrop`/`dragCardId` → `PUT /cards/:id {status}`). `flipColHeights()` keys off `data-col-key` (`'p'+id` for project columns, `'s-'+key` for status columns). The status view groups cards from `STATUSES` (the same constant that drives the status filter chips and the `#cardStatus` options), so a **new status needs adding to `STATUSES`** — see the status-string note below.

- **Status is an open string.** Valid values are `active | pending | done | blocked | archived`, enforced only by the frontend — the DB and API accept any string. Labels are **i18n-driven**: the `#cardStatus` `<select>` options are built dynamically from `STATUSES` by `buildStatusOptions()`, and visible text comes from `statusLabel(key)` → `t('status_'+key)` (used by `cardHTML()` too). New statuses need updates in three places: the `STATUSES` constant (key + emoji), a `status_<key>` entry in **both** `en` and `zh-TW` of the `I18N` dictionary, and the `.status-*` CSS classes (each status now has **two** rules — a light default and a `[data-theme="dark"] .status-*` dark override).

- **UI is bilingual (i18n), English by default.** Visible strings come from an `I18N` dictionary (`en` / `zh-TW`, symmetric key sets) via `t(key)` (lang → `en` → raw-key fallback). Static markup carries `data-i18n` / `data-i18n-placeholder` / `data-i18n-title`, applied by `applyStaticI18n()`; dynamic render paths call `t()` directly. The header switch (`EN | 繁中`, right of **New Project**) calls `setLang()`, which persists to `localStorage` `kanban-lang` (default `en` — anything other than `zh-TW` falls back to `en`), updates `<html lang>`, re-applies static i18n, and re-renders. **Any new user-facing string needs a key in both locales.** The `Project Kanban` brand name is intentionally not translated. See `specs/i18n-en-default-walkthrough.md`.

- **Theme is CSS-variable driven (light/dark), persisted, default = system.** Two token sets drive everything: `:root` (light) and a `[data-theme="dark"]` override on `<html>`; every component reads `var(--…)`, so switching theme just flips that one attribute — no per-component JS, no re-render. A **pre-paint inline script in `<head>`** sets `data-theme` from `localStorage` `kanban-theme` (`light | dark`), falling back to `matchMedia('(prefers-color-scheme: dark)')`, to avoid a flash-of-wrong-theme; the main script reads that attribute back as the source of truth (`let theme = …getAttribute('data-theme')`). The toggle button (🌙/☀️, **right of the language switch**) calls `toggleTheme()` → persist + `applyTheme()`; its glyph/title are dynamic (not `data-i18n`), so `setLang()` also re-calls `applyTheme()`. Dark mode uses a 3-step surface ramp **board → lane → card**, and **light columns are frameless** (`--col-bg` / `--col-border` are `transparent`, dark gives them a lane). **Any new theme-dependent color needs a value in both token sets.** See `specs/kanban-redesign.md`.

- **Animated transitions are GSAP-gated and frontend-only.** Three visual events use the already-loaded GSAP 3.12.5 **core** (no plugins): switching views (`switchView()` fades the current columns out, then `render({viewSwitch:true})` staggers the new ones in and skips `flipColHeights`, since project/status colKeys never match), adding a project column (`flipColHeights()` fades+scales in any `.col` whose colKey is absent from the captured `prev` map — gated on `prev` being non-empty so first load and view switches don't trigger it), and deleting one (`deleteCurrentProject()` fades+scales the `.col[data-proj-id]` out before `load()`). Every tween is wrapped in `if (window.gsap)` with a fallback to the prior instant behavior, so the board still works if GSAP fails to load. Personality is restrained `power2.out`, 0.16–0.3s, no overshoot; there is no `prefers-reduced-motion` handling. Column add/remove animates in the **project view only**. See `specs/view-switch-motion-walkthrough.md`.

## Configuration

Env vars (see `.env.sample`; `.env` is gitignored and **not auto-loaded** — export vars or use a process manager): `PORT` (10023), `BASE_PATH` (`proj-kanban`), `DATA_DIR` (`./data`).
