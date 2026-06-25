# proj-kanban

A lightweight Kanban-style project status tracker. Each column is a project, each card is a status update — with memo notes and a REST API.

> 輕量 Kanban 式專案狀態追蹤工具。直欄為專案，卡片為狀態更新單位，支援 memo 備忘與 REST API。

## 功能

- 雙視圖切換（header 切換、選擇持久化）：
  - **專案視圖**：欄為專案，footer 以狀態篩選
  - **狀態視圖**：欄為狀態，卡片跨專案依狀態分組（顯示所屬專案），footer 以專案篩選；拖曳卡片到別的狀態欄即改狀態
- 卡片支援標題 + memo + 狀態標籤（進行中 / 待處理 / 完成 / 卡住了 / 封存）
- 卡片 modal 可選專案，支援跨專案新增與移動卡片
- 全 CRUD：新增、編輯、刪除專案與卡片
- 順滑過場動畫：切換視圖、新增/刪除專案欄皆有克制的 GSAP 淡入淡出過場（無 GSAP 時自動回退為即時）
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

## AI Agent Skill

A bundled Claude skill (`.claude/skills/proj-kanban-api/`) teaches AI agents to drive the board over this REST API — endpoint selection, correct request bodies, and the footguns — so agents don't have to guess the API shape. Agents that have the repo discover it automatically; it can also be copied into another project's `.claude/skills/` or `~/.claude/skills/`.

> 內建 AI agent skill,教 agent 透過 REST API 操作看板(端點選擇、正確 request body、各種陷阱),可隨 repo 分發或複製到其他專案使用。

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
