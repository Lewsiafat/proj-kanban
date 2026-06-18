# proj-kanban

A lightweight Kanban-style project status tracker. Each column is a project, each card is a status update — with memo notes and a REST API.

> 輕量 Kanban 式專案狀態追蹤工具。直欄為專案，卡片為狀態更新單位，支援 memo 備忘與 REST API。

## 功能

- 多專案直欄看板，快速掌握各專案狀態
- 卡片支援標題 + memo + 狀態標籤（進行中 / 待處理 / 完成 / 卡住了 / 封存）
- 全 CRUD：新增、編輯、刪除專案與卡片
- REST API，可程式化操作

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

Status 值：`active` | `pending` | `done` | `blocked` | `archived`

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
