# proj-kanban

**English** · [繁體中文](./README.zh-TW.md)

A lightweight Kanban-style project status tracker. Each column is a project, each card is a status update — with memo notes and a REST API.

## Features

- Two switchable board views (toggle in the header, choice persisted):
  - **Project view**: columns are projects, with status filtering in the footer
  - **Status view**: columns are statuses, cards grouped across all projects by status (showing their owning project), with project filtering in the footer; drag a card to another status column to change its status
- Cards support a title + memo + status label (active / pending / done / blocked / archived)
- The card modal lets you pick a project, enabling cross-project card creation and moves
- Full CRUD: create, edit, and delete projects and cards
- Bilingual UI that defaults to English and switches to Traditional Chinese (繁體中文) with one click in the header; the choice is persisted in `localStorage` under `kanban-lang` (frontend-only — no API or DB change)
- Light & dark themes (Direction A「Calm」design — sage accent, Mulish type, soft cards) with a one-click toggle right of the language switch; defaults to your system preference and is persisted in `localStorage` under `kanban-theme` (frontend-only — no API or DB change)
- Smooth transitions: switching views and adding/deleting project columns use restrained GSAP fade transitions (falling back to instant behavior when GSAP is unavailable, and honoring `prefers-reduced-motion`)
- REST API for programmatic access

## Quick Start

```bash
# Clone
git clone https://github.com/Lewsiafat/proj-kanban.git
cd proj-kanban

# Install
npm install

# Configure (optional)
cp .env.sample .env

# Run
npm start
# Open http://localhost:10023/proj-kanban/
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `10023` | Server port |
| `BASE_PATH` | `proj-kanban` | URL base path |
| `DATA_DIR` | `./data` | SQLite database directory |

## Dev

```bash
npm run dev   # hot-reload with node --watch
npm test      # run the API test suite (node --test; boots the server on a temp DB)
```

## API

```
GET    /proj-kanban/api/projects
POST   /proj-kanban/api/projects              { name, color }
PUT    /proj-kanban/api/projects/:id          { name, color }
DELETE /proj-kanban/api/projects/:id

POST   /proj-kanban/api/projects/:id/cards    { title, memo, status }
PUT    /proj-kanban/api/cards/:id             { title, memo, status, project_id }
DELETE /proj-kanban/api/cards/:id
```

Status values: `active` | `pending` | `done` | `blocked` | `archived`

## AI Agent Skill

A Claude skill (`plugins/proj-kanban-api/skills/proj-kanban-api/`) teaches AI agents to drive the board over this REST API — endpoint selection, correct request bodies, and the footguns — so agents don't have to guess the API shape. It ships as a **Claude Code plugin**, and this repo doubles as its marketplace:

```bash
/plugin marketplace add Lewsiafat/proj-kanban
/plugin install proj-kanban-api@proj-kanban
```

See `plugins/proj-kanban-api/README.md` for details.

## Stack

- **Backend**: Node.js + Express (ES Modules)
- **Database**: better-sqlite3 (SQLite, stored at `data/kanban.db`)
- **Frontend**: Vanilla HTML/CSS/JS (no build step)

## Self-hosting

The app is a single Express server. Deploy anywhere Node.js runs:

- **VPS**: Run with `node src/index.js`, put behind nginx
- **Railway / Render**: Set env vars, deploy directly

## License

MIT
