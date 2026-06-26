# proj-kanban

[English](./README.md) · **繁體中文**

輕量 Kanban 式專案狀態追蹤工具。每個直欄是一個專案，每張卡片是一筆狀態更新，支援 memo 備忘與 REST API。

## 功能

- 兩種可切換的看板視圖（於 header 切換，選擇會被持久化）：
  - **專案視圖**：欄為專案，footer 以狀態篩選
  - **狀態視圖**：欄為狀態，卡片跨專案依狀態分組（顯示所屬專案），footer 以專案篩選；將卡片拖曳到別的狀態欄即可變更其狀態
- 卡片支援標題 + memo + 狀態標籤（進行中 / 待處理 / 完成 / 卡住了 / 封存）
- 卡片 modal 可選擇專案，支援跨專案新增與移動卡片
- 全 CRUD：新增、編輯、刪除專案與卡片
- 雙語介面，預設為英文，於 header 一鍵切換為繁體中文（Traditional Chinese）；選擇會持久化於 `localStorage` 的 `kanban-lang` 鍵（純前端，無 API 或 DB 變更）
- 順滑過場動畫：切換視圖與新增/刪除專案欄皆採用克制的 GSAP 淡入淡出過場（無 GSAP 時自動回退為即時行為）
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

內建的 Claude skill（`.claude/skills/proj-kanban-api/`）會教 AI agent 透過此 REST API 操作看板 — 包含端點選擇、正確的 request body 以及各種陷阱 — 讓 agent 不必猜測 API 形狀。擁有此 repo 的 agent 會自動發現它；也可複製到其他專案的 `.claude/skills/` 或 `~/.claude/skills/` 使用。

## Stack

- **Backend**：Node.js + Express（ES Modules）
- **Database**：better-sqlite3（SQLite，儲存於 `data/kanban.db`）
- **Frontend**：Vanilla HTML/CSS/JS（無 build 步驟）

## Self-hosting

此 app 是單一 Express 伺服器，可部署於任何能執行 Node.js 的環境：

- **VPS**：以 `node src/index.js` 執行，置於 nginx 之後
- **Railway / Render**：設定環境變數後直接部署

## License

MIT
