# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**English** · [繁體中文](./CHANGELOG.zh-TW.md)

## [Unreleased]

### Added
- **Bilingual UI (i18n)** — the interface now ships in **English** by default with a one-click switch to Traditional Chinese (繁體中文), persisted in `localStorage` under `kanban-lang`. Frontend-only (`public/index.html`) — no REST API or DB schema change. The `README` and `CHANGELOG` now provide an English (default) version alongside a Traditional-Chinese version.

## [1.3.0] - 2026-06-25

### Added
- **Smooth view-switch transition** — toggling between the project view and status view now fades the current columns out and staggers the incoming columns in (GSAP core, `power2.out`, 0.16–0.28s) instead of a hard cut. See `specs/view-switch-motion-walkthrough.md`.
- **Project-column add/remove animations** (project view only) — a newly-added column fades and slightly scales in (folded into `flipColHeights()`); a deleted column fades and scales out before the board reloads. The horizontal reflow of the remaining columns is left instant by design.

### Changed
- All of the above is frontend-only (`public/index.html`: `render()` / `switchView()` / `flipColHeights()` / `deleteCurrentProject()`). Every animation is gated on the already-loaded GSAP 3.12.5 **core** with a fallback to the prior instant behavior — no new dependency, and no behavior change when GSAP is absent. No `prefers-reduced-motion` handling (consistent with the existing code). The REST API, DB schema, and `proj-kanban-api` skill are untouched.

## [1.2.0] - 2026-06-24

### Added
- **Status view** — a second board view toggled in the header (choice persisted to `localStorage` under `kanban-view`). Columns are the five statuses and cards are grouped across **all** projects, each card showing its owning project (color dot + name); empty status columns are kept. See `specs/add-status-view-walkthrough.md`.
- **Orthogonal per-view filters** — the footer filters by status in the project view (existing) and by project in the status view (new project chips), each persisted under its own `localStorage` key and never overwriting the other.
- **Drag a card between status columns** in the status view to change its status (`PUT /api/cards/:id { status }`), isolated from the project view's column-reorder drag.
- **Project dropdown in the card modal** — create a card into any chosen project and move an existing card between projects (`PUT /api/cards/:id { project_id }`); the status-view column's "Add update" button prefills that column's status.
- Developer tooling under `.claude/` (committed with the repo): `Edit|Write` hooks (`check-src-syntax.sh`, `remind-status-sync.sh`), the read-only `api-skill-sync-reviewer` subagent, and the user-invoked `reset-db` skill.

### Changed
- Refactored the board renderer: the original render path became `renderProjectView()` and `render()` now dispatches by view — **project-view behavior is unchanged**. All of the above is frontend-only (`public/index.html`); the REST API, DB schema, and `proj-kanban-api` skill are untouched.

## [1.1.0] - 2026-06-22

### Added
- Bundled AI-agent skill `proj-kanban-api` under `.claude/skills/`, so external agents can drive the board over its REST API without guessing the API shape. Ships `SKILL.md` (operating guide), `references/api.md` (full per-endpoint contract for all 7 endpoints), and `evals/`. See `specs/proj-kanban-api-skill-walkthrough.md`.

## [1.0.1] - 2026-06-18

### Security
- Escape the project `color` value in the board render path to prevent stored XSS via the color field.

### Fixed
- `PUT /api/projects/:id` now returns HTTP 400 with a JSON error on a duplicate project name (`UNIQUE` conflict) instead of an uncaught 500, matching the `POST` handler.

### Changed
- Upgrade `better-sqlite3` from `^9.4.3` to `^12.11.1`, which ships prebuilt binaries for Node 22 — `npm install` no longer needs a C/C++ toolchain (Xcode Command Line Tools).
- `start` / `dev` scripts load `.env` via `--env-file-if-exists`, so the documented `.env` file actually takes effect.

### Added
- `CLAUDE.md` with architecture notes and gotchas for future contributors.

## [1.0.0] - 2026-06-18

### Added
- Initial open-source release: Kanban-style project status tracker with an Express REST API, SQLite storage (`better-sqlite3`), and a vanilla HTML/CSS/JS frontend (no build step).
- Client-side drag-and-drop column reordering, persisted to `localStorage`.
- Footer showing app version and pending-card count.
