# proj-kanban

輕量 Kanban 式專案狀態追蹤工具。直欄為專案，卡片為狀態更新單位，支援 memo 備忘與 REST API。

**Live：** https://lewsi.ddns.net/proj-kanban/

## 功能

- 多專案直欄看板，快速掌握各專案狀態
- 卡片支援標題 + memo + 狀態標籤（進行中 / 待處理 / 完成 / 卡住了 / 封存）
- 全 CRUD：新增、編輯、刪除專案與卡片
- REST API，可程式化操作

## Dev

```bash
npm install
npm run dev   # node --watch src/index.js
# 開 http://localhost:10023/proj-kanban/
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

- Node.js + Express（ES Modules）
- better-sqlite3（SQLite，資料存於 `data/kanban.db`）
- 純 HTML/CSS/JS 前端（無 build step）
