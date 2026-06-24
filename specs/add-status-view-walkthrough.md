# 新增「狀態視圖」+ 視圖切換 + 專案篩選 — Walkthrough

- **分支:** `feat/add-status-view`
- **日期:** 2026-06-24

## 變更摘要

在既有看板上新增第二種「狀態視圖」（欄＝狀態、卡片跨所有專案依狀態分組），與原本的「專案視圖」並存。Header 加 segmented 視圖切換並持久化；footer 篩選依視圖正交切換（專案視圖＝狀態 chips、狀態視圖＝專案 chips，各自獨立持久化）；狀態視圖支援拖曳卡片改狀態；card modal 新增「專案」下拉，支援跨專案新增與移動卡片。**純前端，只改 `public/index.html`，後端／DB／API／skill 文件完全未動**（既有 endpoint 已支援所需操作）。

## 修改的檔案

- **`public/index.html`** — 唯一的程式碼變更（+247/−10），分 6 個 commit：
  - `52f918e` refactor(ui)：抽出 `renderProjectView()`，`render()` 依 `currentView` 分流（狀態視圖先留空殼），新增 `VIEW_KEY`/`currentView`/`loadView`/`saveView`，`flipColHeights()` 改用 `data-col-key`（專案欄 `'p'+id`、狀態欄 `'s-'+key`）對位 FLIP 動畫。
  - `9c7822f` feat(ui)：Header `.view-switch` segmented 切換鈕 + `switchView()`/`updateViewSwitch()`，init 段套用持久化視圖。
  - `8d9a290` feat(status-view)：`renderStatusView()` 固定 5 狀態欄（active→pending→done→blocked→archived、空欄保留）、卡片跨專案依 `status` 分組、`statusCardHTML()` 顯示專案色點＋名、count pill 沿用 `.status-*` 配色。
  - `3977448` feat(status-view)：專案篩選 chips（`activeProjects` + `kanban-project-filter` + `matchesProjectFilter`），`renderStatusBar()` 依視圖分派 `renderStatusChips()`/`renderProjectChips()`。
  - `0a059f1` feat(status-view)：`initStatusDragDrop()` — 拖卡到別的狀態欄即 `PUT /cards/:id { status }` → `load()`；新增 `dragCardId`/`findCard()`，與專案視圖的欄重排拖曳（`dragSrcIdx`）完全隔離。
  - `0ef0f16` feat(card-modal)：card modal 加 `#cardProject` 下拉，`openCardModal(projectId, cardId, presetStatus)` 預選專案＋狀態，`saveCard()` 依 `editing.id` 判別 → 新增走 `POST /projects/:id/cards`、編輯走 `PUT /cards/:id { project_id }`（可跨專案移動）。
- **`specs/add-status-view.md`** — 規格（任務清單已勾選完成）。
- **`docs/superpowers/plans/2026-06-23-add-status-view.md`** — 7 任務實作計畫（設計記錄）。
- **`.claude/settings.json`** — 加入 `permissions.allow: ["mcp__playwright__*"]`，讓瀏覽器驗證免逐次提示。
- **`.gitignore`** — 忽略 `.playwright-mcp/`（Playwright scratch 輸出）。

## 技術細節

- **後端為何不動：** 拖曳改狀態用既有 `PUT /cards/:id`（只傳 `{status}` 安全，後端以 `?? card.x` fallback 保留其他欄位）；跨專案新增用 `POST /projects/:id/cards`；移動卡片用 `PUT /cards/:id { project_id }`。三者既有 endpoint 皆已支援，故 `src/index.js`、DB schema、`proj-kanban-api` skill 文件皆未修改。
- **兩套 filter 正交：** 狀態篩選（`activeStatuses` / `kanban-status-filter`）與專案篩選（`activeProjects` / `kanban-project-filter`）為完全獨立的變數、Set、localStorage key 與 match 函式；`renderStatusBar()` 依 `currentView` 只渲染其中一套 chips，互不覆蓋。
- **兩套拖曳隔離：** 專案視圖欄重排（`initDragDrop` / `dragSrcIdx`）與狀態視圖卡片改狀態（`initStatusDragDrop` / `dragCardId`）綁在不同 DOM、各自以 sentinel 判別；`render()` 每次重建看板並只呼叫對應視圖的 init，兩者不會同時存在 listener。
- **FLIP 動畫對位：** `render()` 擷取舊欄高與 `flipColHeights()` 查找皆改用 `data-col-key`，專案欄 `'p'+id`、狀態欄 `'s-'+key`，切換視圖與卡數變動時欄高漸進動畫正確對映。
- **開發流程：** 以 superpowers Subagent-Driven Development 執行——每任務由實作 subagent 完成後，經 task reviewer 做 spec＋品質雙重審查；最後一道整支分支 review（判定 Ready to merge）＋ 端到端 Playwright 回歸（5/5 PASS、含正交 filter 跨功能檢查、0 defect）。因本專案無 test runner，驗證採 `node --check` 語法 gate ＋ Playwright 瀏覽器手動驗證、全程 console 無錯誤。
