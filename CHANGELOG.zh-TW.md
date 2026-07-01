# 變更日誌

本專案的所有重要變更皆記錄於此檔案。

格式基於 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)，
並且本專案遵循 [語意化版本](https://semver.org/spec/v2.0.0.html)。

[English](./CHANGELOG.md) · **繁體中文**

## [1.7.0] - 2026-07-01

針對 REST API 與前端的 code-review 強化（13 項追蹤問題中的 12 項;API 認證刻意延後,仍為 open）。

### 新增
- **API 測試套件** — 自足式 `node:test` 套件（`test/api.test.js`,以 `npm test` 執行），會在拋棄式 DB 上啟動 server,實測全部 7 個 endpoint 及各項強化修復。此為本 repo 首次自動化測試覆蓋。
- **Schema migration 機制** — 新增 `meta` 表追蹤 `schema_version`,啟動時將有序的 `migrations` 陣列包在 transaction 內套用（additive `ALTER TABLE ADD COLUMN`），取代先前「改 schema 後砍掉重建 DB」的做法。
- **`prefers-reduced-motion` 支援** — 新增 `reduceMotion` 旗標,將每個 GSAP 動畫導向即時 fallback,並以 CSS `@media (prefers-reduced-motion: reduce)` 中和過場,照顧要求減少動態效果的使用者。

### 變更
- **時間戳改以 UTC 儲存**（`datetime('now')`,不再用 `'localtime'`）;網頁前端顯示時再做在地化。
- **前端拆分** — CSS 移至 `public/styles.css`、`I18N` 字典移至 `public/i18n.js`（皆以靜態方式提供,並掛在 `BASE_PATH` 下）;`index.html` 相應精簡。純重構,行為不變。
- **錯誤回應脫敏** — POST/PUT `/projects` 不再回傳原始 SQLite 訊息:重複名稱回 `{"error":"name already exists"}`、其他 DB 錯誤回 `{"error":"invalid request"}`,詳細錯誤僅寫入 server log。

### 修正
- **Cascade delete 現在真的會執行** — 啟用 `foreign_keys` pragma,刪除欄目時會一併刪除其 cards,不再在 DB 裡靜默留下 orphan。
- **`PUT /cards/:id` 驗證移動目標** — 不存在的 `project_id` 現在回 400（`target project not found`），不再使 card 變 orphan。
- **`PUT` 不再清空必填欄位** — 空白 `name`/`title` 回 400,不再靜默清除（選填欄位傳 `""` 仍會清空）。
- **原子化 `position` 指派** — `MAX(position)+1` 的 SELECT 與 INSERT 包進 transaction,並發建立不會撞號。
- **`esc()` 補上單引號轉義**,封閉潛在的屬性注入 XSS 破口。
- **`load()` 網路錯誤時不再清空看板** — 改為顯示可關閉的錯誤橫幅並保留上次畫面。

## [1.6.0] - 2026-06-30

### 新增
- **淺色與深色主題** — 介面現在同時提供淺色與深色,套用 **Direction A「Calm」** 改版（sage 綠主色、`Mulish` + `Noto Sans TC` 字型、柔和浮動卡片、三層 **底板 → lane → 卡片** surface ramp）。切換鈕（🌙/☀️）位於語言切換鈕右側;預設跟隨系統 `prefers-color-scheme`,並持久化於 `localStorage` 的 `kanban-theme`。完全以 CSS variables 驅動（`:root` + `[data-theme="dark"]`），並在 `<head>` 加 pre-paint 腳本避免閃爍。純前端 — 不變更 REST API 或 DB schema。詳見 `specs/kanban-redesign-walkthrough.md`。

### 變更
- **全面視覺改版**為「Calm」方向:字型由 Fraunces/Geist 改為 `Mulish` + `Noto Sans TC`、sage 綠主色、重做看板/卡片/欄/modal/header/footer、狀態 badge 主題感知配色,New Project 色票改為設計稿的 6 色（專案既有顏色仍可選）。所有既有行為（雙視圖、篩選、拖曳、排序、GSAP 過場、i18n）皆保留;5 個狀態與 `proj-kanban-api` REST 契約未變。
- header 版本 chip 改為**單一來源自 `package.json`** — server 送出 `index.html` 時置換 `__APP_VERSION__` token（per-request 讀取,dev 即時編輯仍可見），顯示的版本會自動跟隨每次 release。

### 修正
- 前端版本 chip 原本寫死為 `v1.0.1`、從不跟隨 release;現已反映實際的 `package.json` 版本。

## [1.5.0] - 2026-06-29

### 新增
- 將 `proj-kanban-api` skill 包裝成可分享的 skill-only **Claude Code plugin**(位於 `plugins/proj-kanban-api/`),本 repo 同時兼做其 marketplace（`.claude-plugin/marketplace.json`）。透過 `/plugin marketplace add Lewsiafat/proj-kanban` 再 `/plugin install proj-kanban-api@proj-kanban` 安裝。
- Plugin onboarding 文件（`plugins/proj-kanban-api/README.md` / `README.zh-TW.md`），以及 skill `SKILL.md` 的「Getting a server」段。
- 本 repo 專屬、plugin-aware 的 `release` skill,同步 bump `package.json` 與 plugin 的 `plugin.json`（版號 invariant:`package.json` === `plugin.json` === tag）。

### 變更
- 將 skill 從 `.claude/skills/proj-kanban-api/` 搬到 `plugins/proj-kanban-api/skills/proj-kanban-api/`（保留 git 歷史），並更新所有引用（`api-skill-sync-reviewer` agent、`CLAUDE.md`、`README` EN/zh-TW）。repo 內開發現在需先安裝 plugin,skill 才會載入。不變更 `src/` / `public/`、REST API 或 DB schema。詳見 `specs/proj-kanban-api-plugin-walkthrough.md`。

## [1.4.1] - 2026-06-26

### 變更
- **`.claude/` 開源/fork-readiness 整理** — 將第三方 superpowers plugin 技能（`executing-plans/`、`writing-plans/`）加入 gitignore、從 tracked `settings.json` 移除個人專用的 `mcp__playwright__*` 權限 wildcard（gitignored 的 `settings.local.json` 仍保留本機的具體權限），並把三個 fork-facing 的繁中檔英文化：`remind-status-sync.sh` hook、`reset-db` skill、`api-skill-sync-reviewer` agent。僅限開發工具 — 不變更 `src/` / `public/`、REST API 或 DB schema。詳見 `specs/claude-fork-readiness-walkthrough.md`。

### 修正
- **`remind-status-sync.sh` i18n drift** — hook 的提醒文字與觸發 grep 已過時（仍指舊的 `<select>` 選項 / `cardHTML()` 的 `labels` map）。現已對齊現況 i18n-driven 的三處：`STATUSES` 常數、`I18N` 字典中 `en` 與 `zh-TW` **兩語系**的 `status_<key>`、以及 `.status-*` CSS 類別（與 `CLAUDE.md` 一致）。

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
