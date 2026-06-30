# Kanban Redesign — Direction A「Calm」+ 明暗主題切換 — Walkthrough

- **分支:** `feat/kanban-redesign`
- **日期:** 2026-06-30

## 變更摘要

依 claude.ai/design 設計專案「Kanban project redesign」的 **Direction A —「Calm」** 高保真設計稿(透過 DesignSync MCP 匯入),
將前端全面改版為 sage 綠 + Mulish 字型的柔和風格,並新增 **light / dark 雙主題**:在語言切換鈕右側加入主題切換鈕(🌙/☀️),
預設跟隨系統、可切換、持久化。所有既有功能(雙視圖、篩選、拖曳、排序、GSAP、i18n、CRUD)維持不變;後端 REST API 與
`proj-kanban-api` skill 契約**完全未動**。

## 修改的檔案

- **`public/index.html`** — 本次改版唯一的程式碼變動(+158/−65):
  - **字型**:Fraunces / Geist → `Mulish` + `Noto Sans TC`(Google Fonts 連結 + `--font-*`)。
  - **主題 token 系統**:改寫 `:root`(淺色)並新增 `[data-theme="dark"]` 一整套暗色 token;新增 `--col-bg` / `--col-border` /
    `--accent-tint` / `--accent-on` / `--scrim` / `--shadow-modal` / `--radius-card` 等變數,所有元件改讀 `var(--…)`。
  - **`<head>` pre-paint 腳本**:首屏前依 `localStorage['kanban-theme']`(fallback `prefers-color-scheme`)設好 `<html data-theme>`,避免閃爍。
  - **主題切換**:header 語言鈕右側新增 `#themeToggle`;JS 新增 `theme` 狀態 + `applyTheme()` + `toggleTheme()`;`setLang()` 與
    init 皆呼叫 `applyTheme()`(因鈕的圖示/title 是動態、非 `data-i18n`)。i18n 新增 `theme_to_dark` / `theme_to_light`(en + zh-TW)。
  - **視覺重做**:header(加版本 chip、分段控制 active 改 accent tint)、欄、卡片、modal、footer chips、狀態 badge(5 鍵不變,
    新增 `[data-theme="dark"] .status-*` 暗色覆寫)、色票(改設計稿 6 色 + 圓角方塊選中環)。
  - **三層 surface ramp**:淺色與暗色皆為 **底板 → column lane → 卡片**(淺色 `#ecebe5` → `#f6f5f1` → `#fff`;暗色 `#101214` → `#1a1d21` → `#272c32`)。
  - **版本字串**:由 footer 移到 header chip(移除 `#footerVer` 與 `.footer-ver`);chip 內容改為 `__APP_VERSION__` 占位符,由 server 注入(見 `src/index.js`)。
- **`src/index.js`** — SPA 兩條路由改為送出 `index.html` 時把 `__APP_VERSION__` 置換為 `package.json` 的 `version`(per-request 讀取,保留 dev live-edit)。修正前端版本 chip 長期寫死 `v1.0.1`、與實際版本(1.5.0)不符;後端 7 支資料端點與 `proj-kanban-api` skill 契約未動。
- **`CLAUDE.md`** — 「Things that will trip you up」新增主題系統說明 bullet;狀態字串 note 補上「每個狀態現在有 light + dark 兩條 `.status-*` 規則」;架構段落註明 SPA 版本注入。
- **`specs/kanban-redesign.md`** — 任務規格(決策、token、清單、驗證標準);本次將清單打勾。
- **`specs/kanban-redesign-walkthrough.md`** — 本文件。

## 技術細節

- **保留 5 個狀態**(`active / pending / done / blocked / archived`):設計稿的 4 欄狀態名只當示意,不重建 DB、不動 API 與 skill 契約。
- **三層層次的方向與暗色一致**:lane 比底板亮、卡片再更亮(白)。初版淺色 column 依設計稿設為透明,經使用者回饋後改為有色 lane + 細邊框,
  以和背景、卡片做出區隔。
- **scrim 修正**:原 `.modal-overlay` 用 `color-mix(var(--text)…)`,在暗色會因 `--text` 變亮而「洗白」遮罩;改為主題感知的 `--scrim`
  (淺 `rgba(31,36,33,.38)` / 暗 `rgba(0,0,0,.6)`)。
- **色票回歸修正**:調色盤由 10 色縮為設計稿 6 色後,既有專案的舊色(如 `#6366f1`)不在盤中 → 編輯儲存時會 fallback 靜默改色。
  修法:`openProjectModal()` 在色票列前置「專案目前顏色」(若不在盤中),確保現有色永遠可選且選中。
- **版面模型維持現況**:固定寬度欄 + 水平捲動(專案視圖可任意多欄),未改成設計稿等寬 4 欄。
- **版本號單一來源**:header 版本 chip 由 server 從 `package.json` 注入(`__APP_VERSION__` token),不再寫死;之後 `/release` bump `package.json` 後前端自動跟著正確,無需再手動同步。
- **刻意未做**(超出本次範圍):手機專屬堆疊版面 + FAB、空狀態插圖、modal 雙語副標與狀態分段控制(沿用既有 `<select>` 與單語 i18n 慣例)。

## 驗證

以 Playwright 實機驗證(淺/暗 × 專案/狀態視圖、modal、切換持久化):

- ✅ 淺色 `#ecebe5` 底板 / 暗色 `#101214`;accent 隨主題(`#5c9a7b` / `#79b596`)切換。
- ✅ 主題鈕在語言鈕右側,切換即時生效、`localStorage` 持久化、圖示/title 正確、預設跟隨系統。
- ✅ 兩視圖在兩主題皆正常(6 專案欄 / 45 卡;5 狀態欄);三層 surface ramp 清晰。
- ✅ 暗色 modal scrim 正確壓暗;6 色票與既有色保留可選並選中。
- ✅ 既有功能(篩選、拖曳、排序、GSAP、i18n)行為不變;唯一 console error 為既有 favicon 404。
