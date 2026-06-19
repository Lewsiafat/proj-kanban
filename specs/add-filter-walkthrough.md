# 依狀態篩選卡片 + 底部狀態統計列 — Walkthrough

- **分支:** `feat/add-filter`
- **日期:** 2026-06-19

## 變更摘要

在 board 底部新增一條狀態統計列：「全部 N」+ 5 個狀態 chip（進行中 / 待處理 / 完成 / 卡住了 / 封存），各顯示跨所有專案的卡片總數，且本身即篩選按鈕。chip 採多選切換篩選整個 board，搭配 GSAP 轉場（卡片進/退場、欄位外框高度漸進）讓畫面變化不突兀。純前端變更，後端 / DB / API 不動。

## 修改的檔案

- `public/index.html` — 全部實作（+139 / −12）：
  - **HTML**：footer 的 `#pendingBadge` → `#statusBar` 容器；`<head>` 以 CDN 載入 GSAP core。
  - **CSS**：`.status-bar` / `.filter-chip`（active / inactive / `.chip-all.active`）、`.card.anim`（進場暫關 transition）、`.col.h-anim .col-body`（高度動畫時隱藏捲軸）。
  - **JS**：`STATUSES` 常數；`activeStatuses` 篩選狀態 + `loadFilter()` / `saveFilter()`（localStorage `kanban-status-filter`）；`renderStatusBar()`、`toggleStatus()`、`clearFilter()`、`applyFilter(before)`、`visibleSet()`、`flipColHeights()`；`render()` 卡片渲染加篩選並掛欄位高度 FLIP；`cardHTML()` 卡片加 `data-status`。
- `specs/add-filter.md` — 規格文件（新增，任務清單已全數打勾）。
- `specs/add-filter-walkthrough.md` — 本文件（新增）。

## 技術細節

- **多選 + 「全部」**：`activeStatuses`（Set）為空 = 顯示全部；「全部」chip 在無篩選時高亮，點它 `clearFilter()` 清空。chip 數字永遠是總數，不受篩選影響；每欄 `col-count` 與篩選無關維持總數；不隱藏空欄。
- **只動可見性改變的卡片**：`applyFilter(before)` 比較切換前後的可見狀態集合，只對「新被隱藏」播退場淡出、「新出現」播進場；可見性沒變的卡片完全不碰，消除先前「動畫後整片重排漂移」的問題。
- **進場尾巴修正**：`.card` 帶 `transition: transform`，會比 gsap 慢 140ms 收尾、造成動畫後再往上跳一下。進場期間對卡片加 `.anim`（`transition:none`），讓位移純由 gsap 控制，`onComplete` 移除以恢復 hover transition。
- **欄位外框高度 FLIP**：`flipColHeights()` 掛在 `render()` 內，重畫前量舊高、重畫後量新自然高，對有變者 `gsap.fromTo(舊高 → 新高)`，`clearProps:'height'` 還原 `auto`。涵蓋篩選 / 新增 / 刪除三情境；初次載入、拖曳排序因高度未變自動略過。欄內個別卡片補位位移仍為瞬間（未引入 GSAP Flip plugin）。
- **GSAP 漸進增強**：core 由 CDN 載入；`window.gsap` 不存在時所有動畫路徑自動退回直接重畫，篩選功能不受影響。
- **驗證**：以 Playwright 在臨時 DATA_DIR（不污染真實 DB）跑 24 項斷言全過 —— chip 數量/數字、單選/多選、「全部」清除、重整持久化、進場 `.anim` 機制與清理、欄位 `.h-anim` + inline height 與清理、無 JS 例外。
