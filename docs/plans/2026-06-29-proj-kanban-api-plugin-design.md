# Design: Package `proj-kanban-api` as a shareable Claude Code plugin

**Date:** 2026-06-29
**Status:** Approved
**Language:** English (primary) · [繁體中文](./2026-06-29-proj-kanban-api-plugin-design.zh-TW.md)

## Overview

Extract the repo's `proj-kanban-api` skill into a standalone, installable **skill-only
Claude Code plugin**, and make **this repo double as the plugin marketplace**. Installing the
plugin gives the recipient the ability to drive a proj-kanban board over its 7 REST endpoints.
The kanban server itself is **not** bundled — recipients run their own (`npm start`) or point at
an existing one.

## Goals

- Ship `proj-kanban-api` as a plugin distributable via `/plugin marketplace add`.
- Keep distribution in this repo (one git URL gives both the skill plugin and, for those who
  want it, the runnable server source that already lives here).
- Add a **project-local `release` skill** tailored to this repo, so releases keep the plugin
  version in lockstep with the app version.

## Non-goals (YAGNI)

- Do **not** bundle the Express/SQLite/frontend service into the plugin.
- Do **not** bundle the dev-tooling (`hooks`, `api-skill-sync-reviewer` agent, `reset-db` skill,
  `.mcp.json`) into the plugin.
- Do **not** build a dynamic server-URL configuration mechanism — document it instead.
- Do **not** give the plugin an independent version line or its own CHANGELOG.

## Decisions (from brainstorming)

| Decision | Outcome |
|---|---|
| Plugin scope | **Skill-only** — just `proj-kanban-api`; server not bundled. |
| Distribution | **This repo doubles as a marketplace** (`.claude-plugin/marketplace.json`). |
| De-dup of the skill | **Move entirely** to `plugins/`; no copy left in `.claude/skills/`. |
| Docs language | **English primary**, `*.zh-TW.md` companions linked (matches repo's README/CHANGELOG pattern). |
| Plugin version | **Coupled to the app version** (starts at `1.4.1`, = `package.json`); released together. |
| Release tooling | **New project-local `release` skill** (plugin-aware), supersedes the generic global one for this repo. |

## Verified plugin/marketplace schema

- `marketplace.json` lives at the repo-root `.claude-plugin/marketplace.json`. Required:
  `name`, `owner.name`, `plugins[]`. Each plugin entry needs `name` + `source`, where `source`
  is a path **relative to the repo root** (e.g. `./plugins/proj-kanban-api`).
- `plugin.json` lives at `<plugin>/.claude-plugin/plugin.json`. Only `name` (kebab-case) is
  required; `version` optional (falls back to git SHA if omitted).
- Skills are auto-discovered at `<plugin>/skills/<name>/SKILL.md` — no need to list them in
  `plugin.json`.
- On install the plugin directory is copied to `~/.claude/plugins/cache/`, so a plugin **cannot
  reference files outside its own directory** (e.g. the repo's `src/`). Irrelevant here — the
  plugin is skill-only and self-contained.

## Target file structure

```
proj-kanban/                              (existing repo; also the marketplace)
├── .claude-plugin/
│   └── marketplace.json                  ← NEW (marketplace listing)
├── plugins/
│   └── proj-kanban-api/
│       ├── .claude-plugin/
│       │   └── plugin.json               ← NEW (version 1.4.1)
│       ├── README.md                     ← NEW (English primary)
│       ├── README.zh-TW.md               ← NEW (linked from README.md)
│       └── skills/
│           └── proj-kanban-api/          ← git mv'd from .claude/skills/
│               ├── SKILL.md              (+ "getting a server" note)
│               ├── references/api.md
│               └── evals/evals.json
├── .claude/
│   ├── skills/
│   │   └── release/SKILL.md              ← NEW (project-local release skill)
│   └── agents/
│       └── api-skill-sync-reviewer.md    ← UPDATED (4 path references)
├── CLAUDE.md                             ← UPDATED (skill path, dev note, new release skill)
├── README.md / README.zh-TW.md           ← UPDATED (skill path, marketplace install)
└── src/ public/ ...                      (server source, unchanged)
```

Notes:
- Directory is `plugins/` (plural) — matches the documented convention and leaves room for a
  second plugin without restructuring.
- The skill folder name stays `proj-kanban-api`; the namespaced invocation is
  `/proj-kanban-api:proj-kanban-api` (auto-trigger by description is the primary path; the full
  name is secondary).
- `evals/` moves wholesale with the skill (it is part of the skill; harmless to recipients).

## Manifest contents

**`.claude-plugin/marketplace.json`** (repo root):
```json
{
  "name": "proj-kanban",
  "owner": { "name": "Lewsifat", "email": "lewsiafat@gmail.com" },
  "description": "proj-kanban skills & tools",
  "plugins": [
    {
      "name": "proj-kanban-api",
      "source": "./plugins/proj-kanban-api",
      "description": "Drive a proj-kanban board over its REST API (7 endpoints)."
    }
  ]
}
```

**`plugins/proj-kanban-api/.claude-plugin/plugin.json`**:
```json
{
  "name": "proj-kanban-api",
  "version": "1.4.1",
  "description": "Read and mutate a proj-kanban kanban board over its REST API.",
  "author": { "name": "Lewsifat", "email": "lewsiafat@gmail.com" },
  "repository": "https://github.com/Lewsiafat/proj-kanban",
  "license": "MIT",
  "keywords": ["kanban", "rest-api", "proj-kanban"]
}
```

The `marketplace.json` plugin entry deliberately omits `version` (one fewer sync point;
`plugin.json` is the single source of the plugin version).

## Skill move + connected updates

1. `git mv .claude/skills/proj-kanban-api → plugins/proj-kanban-api/skills/proj-kanban-api`
   (preserves history).
2. Update the three files that reference the old path:
   - `.claude/agents/api-skill-sync-reviewer.md` — 4 references (description, intro line, the two
     "Files to compare" bullets).
   - `CLAUDE.md` — the skill path + the line describing where the skill ships.
   - `README.md` / `README.zh-TW.md` — the skill path, plus a short "this repo is a marketplace,
     install like this" note.
3. **Server-URL gap (docs-only):** add a short "Getting a server" paragraph to `SKILL.md` and the
   plugin README: if you have no server, `git clone … && npm install && npm start` (default
   `http://localhost:10023/proj-kanban/api`); substitute your host/port/`BASE_PATH` if different.
   SKILL.md already documents that the API lives at `/${BASE_PATH}/api`, so only the "where to get
   one" sentence is new.

## New project-local `release` skill

`.claude/skills/release/SKILL.md` — **not** bundled in the plugin; it is repo maintenance tooling.
Modeled on the generic global `release` skill, with three repo-specific customizations:

| Customization | Detail |
|---|---|
| Sync the plugin version | On bump, set the same version in **both** `package.json` and `plugins/proj-kanban-api/.claude-plugin/plugin.json`. |
| Stage `.claude/` | Drop the global skill's "never stage `.claude/`" rule — in this repo `.claude/` and `plugins/` **must** be committed. |
| Honor repo conventions | Update both `CHANGELOG.md` and `CHANGELOG.zh-TW.md`; commit `chore(release): vX.Y.Z`; annotated tag `vX.Y.Z`; push. |

Everything else follows the established release flow: ask for the version → update docs → commit →
merge back to main if on a feature branch → tag → push → report.

## Installer experience

```bash
/plugin marketplace add Lewsiafat/proj-kanban      # or a local path / full git URL
/plugin install proj-kanban-api@proj-kanban
```

After install the skill auto-loads and triggers on mentions of kanban/board/column/etc. The plugin
README (one-line purpose → two install commands → "getting a server" → pointer back to the repo for
the full API contract) is the recipient's entry point.

## Maintenance impact (disclosed)

- **Working inside this repo no longer auto-loads the skill** (consequence of "move entirely"). To
  use it while developing here, `/plugin marketplace add .` + install, or load it manually. Noted in
  `CLAUDE.md`.
- **`release` is now project-local.** The repo's own `release` skill takes precedence over the
  global one and is the canonical release path going forward.
- **`api-skill-sync-reviewer`** keeps working unchanged after the path update (still compares
  `src/index.js` ↔ the skill docs at their new location).

## Task breakdown (for the implementation plan)

1. Create `plugins/proj-kanban-api/.claude-plugin/plugin.json`.
2. Create `.claude-plugin/marketplace.json`.
3. `git mv` the skill into `plugins/proj-kanban-api/skills/proj-kanban-api/`.
4. Add the "Getting a server" note to the moved `SKILL.md`.
5. Create `plugins/proj-kanban-api/README.md` + `README.zh-TW.md`.
6. Update path references in `api-skill-sync-reviewer.md`, `CLAUDE.md`, `README.md`,
   `README.zh-TW.md`.
7. Create `.claude/skills/release/SKILL.md` (project-local, plugin-aware).
8. Verify: `/plugin marketplace add .` + install resolves and the skill loads; re-run
   `api-skill-sync-reviewer` to confirm no drift after the move.
