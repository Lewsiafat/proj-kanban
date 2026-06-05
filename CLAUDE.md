# proj-kanban

輕量 Kanban 專案狀態追蹤工具。

## Dev 指令

```bash
npm install
npm run dev        # node --watch，自動重啟
# 瀏覽 http://localhost:10023/proj-kanban/
```

## 架構

```
src/index.js        # Express server + SQLite 初始化 + 所有 API routes
public/index.html   # 單頁前端（Vanilla JS，無 build）
data/kanban.db      # SQLite DB（gitignore，VPS 持久化）
```

### DB Schema

- `projects`：id, name, color, position, created_at
- `cards`：id, project_id, title, memo, status, position, created_at, updated_at

### API Routes（掛在 `/{BASE_PATH}/api`）

| Method | Path | 說明 |
|--------|------|------|
| GET | /projects | 所有專案 + 各自的 cards |
| POST | /projects | 新增專案 |
| PUT | /projects/:id | 更新專案 |
| DELETE | /projects/:id | 刪除專案（CASCADE 刪 cards） |
| POST | /projects/:id/cards | 新增卡片到指定專案 |
| PUT | /cards/:id | 更新卡片（可跨欄移動：改 project_id） |
| DELETE | /cards/:id | 刪除卡片 |

## 部署資訊

| 項目 | 值 |
|------|---|
| Port | 10023 |
| VPS path | `/srv/projects/proj-kanban/` |
| URL | https://lewsi.ddns.net/proj-kanban/ |
| Systemd | `proj-kanban.service` |
| Nginx conf | `/etc/nginx/conf.d/projects/proj-kanban.conf` |
| DB | `/srv/projects/proj-kanban/data/kanban.db` |

## 手動部署

```bash
ssh lewsi.ddns.net "cd /srv/projects/proj-kanban && git pull && npm install --production && sudo systemctl restart proj-kanban"
```

GitHub Actions workflow 在 `.github/workflows/deploy.yml`（需從 Mac push，token 缺 workflow scope）。

## 已知問題 / Gotchas

- `data/` 資料夾 gitignore，VPS 上的 DB 不會被覆蓋
- `better-sqlite3` 是 native addon，`npm install` 時會編譯，需要 build tools
- BASE_PATH 從 `.env` 讀取，本地開發記得建 `.env`
