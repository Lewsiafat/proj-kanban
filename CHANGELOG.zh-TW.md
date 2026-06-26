# 變更日誌

本專案的所有重要變更皆記錄於此檔案。

格式基於 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)，
並且本專案遵循 [語意化版本](https://semver.org/spec/v2.0.0.html)。

[English](./CHANGELOG.md) · **繁體中文**

## [1.4.0] - 2026-06-26

### 新增
- **雙語介面（i18n）** — 介面現在預設為 **English**，並可在右上角（**New Project** 之後）一鍵切換為繁體中文（Traditional Chinese），偏好設定持久化於 `localStorage` 的 `kanban-lang`。以零框架方式實作：`I18N` 字典（`en` / `zh-TW`）+ `t()` helper、靜態標記用 `data-i18n` 屬性、狀態標籤改為 locale-aware — 每個動態字串（卡片、彈窗、toast、篩選標籤、排序選項）都會在切換時重新渲染。僅限前端（`public/index.html`）— 不變更 REST API 或 DB schema。`README` 與 `CHANGELOG` 現在同時提供英文版（預設）與繁體中文版（`README.zh-TW.md`、`CHANGELOG.zh-TW.md`）。

## [1.3.0] - 2026-06-25

### 新增
- **流暢的視圖切換轉場** — 在專案視圖與狀態視圖之間切換時，現在會將當前欄位淡出，並讓進入的欄位錯落淡入（GSAP core、`power2.out`、0.16–0.28s），取代原本的硬切。詳見 `specs/view-switch-motion-walkthrough.md`。
- **專案欄位新增/移除動畫**（僅限專案視圖）— 新增的欄位會淡入並略微放大（併入 `flipColHeights()`）；刪除的欄位會在看板重新載入前淡出並縮放。其餘欄位的水平重排則刻意保持為即時。

### 變更
- 以上所有變更皆僅限前端（`public/index.html`：`render()` / `switchView()` / `flipColHeights()` / `deleteCurrentProject()`）。每個動畫都以已載入的 GSAP 3.12.5 **core** 為前提，並在缺少 GSAP 時回退為原本的即時行為 — 不新增依賴，且 GSAP 缺席時行為不變。未處理 `prefers-reduced-motion`（與既有程式碼一致）。REST API、DB schema 與 `proj-kanban-api` skill 皆未更動。

## [1.2.0] - 2026-06-24

### 新增
- **狀態視圖** — 在標頭可切換的第二個看板視圖（選擇持久化於 `localStorage` 的 `kanban-view`）。欄位為五種狀態，卡片橫跨**所有**專案分組，每張卡片顯示其所屬專案（色點＋名稱）；空的狀態欄位會保留。詳見 `specs/add-status-view-walkthrough.md`。
- **各視圖正交的篩選器** — 頁尾在專案視圖中以狀態篩選（既有），在狀態視圖中以專案篩選（新的專案標籤），各自持久化於專屬的 `localStorage` 鍵，互不覆蓋。
- 在狀態視圖中**將卡片拖曳至不同狀態欄位**以變更其狀態（`PUT /api/cards/:id { status }`），與專案視圖的欄位重排拖曳相互隔離。
- **卡片彈窗中的專案下拉選單** — 可將卡片建立到任一選定專案，並在專案之間移動既有卡片（`PUT /api/cards/:id { project_id }`）；狀態視圖欄位的「＋ 新增更新」會預填該欄位的狀態。
- `.claude/` 底下的開發工具（隨 repo 一併提交）：`Edit|Write` hooks（`check-src-syntax.sh`、`remind-status-sync.sh`）、唯讀的 `api-skill-sync-reviewer` subagent，以及使用者觸發的 `reset-db` skill。

### 變更
- 重構看板渲染器：原本的渲染路徑變為 `renderProjectView()`，而 `render()` 現在依視圖分派 — **專案視圖的行為不變**。以上所有變更皆僅限前端（`public/index.html`）；REST API、DB schema 與 `proj-kanban-api` skill 皆未更動。

## [1.1.0] - 2026-06-22

### 新增
- 在 `.claude/skills/` 底下隨附 AI agent skill `proj-kanban-api`，讓外部 agent 能透過其 REST API 操作看板，而無須猜測 API 的形狀。隨附 `SKILL.md`（操作指南）、`references/api.md`（所有 7 個 endpoint 的完整逐項契約）與 `evals/`。詳見 `specs/proj-kanban-api-skill-walkthrough.md`。

## [1.0.1] - 2026-06-18

### 安全性
- 在看板渲染路徑中跳脫專案的 `color` 值，以防止透過 color 欄位的儲存型 XSS。

### 修正
- `PUT /api/projects/:id` 在專案名稱重複（`UNIQUE` 衝突）時，現在會回傳帶有 JSON 錯誤的 HTTP 400，而非未捕捉的 500，與 `POST` handler 一致。

### 變更
- 將 `better-sqlite3` 從 `^9.4.3` 升級至 `^12.11.1`，其隨附 Node 22 的預建二進位檔 — `npm install` 不再需要 C/C++ 工具鏈（Xcode Command Line Tools）。
- `start` / `dev` 腳本透過 `--env-file-if-exists` 載入 `.env`，使文件記載的 `.env` 檔案確實生效。

### 新增
- 新增 `CLAUDE.md`，內含架構說明與供未來貢獻者參考的注意事項。

## [1.0.0] - 2026-06-18

### 新增
- 初始開源發布：Kanban 風格的專案狀態追蹤器，具備 Express REST API、SQLite 儲存（`better-sqlite3`）與純 HTML/CSS/JS 前端（無建置步驟）。
- 用戶端的拖放欄位重排，並持久化至 `localStorage`。
- 頁尾顯示應用程式版本與待處理卡片數。
