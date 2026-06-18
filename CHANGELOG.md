# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
