# 專案欄卡片自動排序（add-sort-on-projects-items）

- **分支:** `feat/add-sort-on-projects-items`
- **日期:** 2026-06-26

## 描述

在**專案視圖**為每個專案欄內的卡片新增「自動排序」功能。在 header 加入**單一排序下拉選單**，把「排序欄位 × 正/反序」直接展開成選項（共 7 項）：

| 下拉選項 | 內部值 | 行為 |
|---|---|---|
| 預設 | `default` | 原始 `position, id` 順序（後端回傳順序） |
| 更新時間（新→舊） | `updated-desc` | 依 `updated_at` 由新到舊 |
| 更新時間（舊→新） | `updated-asc` | 依 `updated_at` 由舊到新 |
| 建立時間（新→舊） | `created-desc` | 依 `created_at` 由新到舊 |
| 建立時間（舊→新） | `created-asc` | 依 `created_at` 由舊到新 |
| 狀態（正序） | `status-asc` | 依 `STATUSES` 順序（進行中→待處理→完成→卡住了→封存），同狀態內以 `position` 次序 |
| 狀態（反序） | `status-desc` | `STATUSES` 反序 |

排序選擇為**全看板共用一組設定**，以單一字串（如 `updated-desc`）持久化到 `localStorage`（key：`kanban-card-sort`），與現有的 view / filter / 欄位順序一致。`sortCards()` 以 `split('-')` 拆出 `field` 與 `dir`，方向用 `sign = dir === 'asc' ? 1 : -1` 套到比較結果上。

**範圍限制：** 純前端，**不修改後端 `src/index.js`、DB schema 或 API**。排序只作用於專案視圖；狀態視圖（依狀態分群）維持不變，不在本次範圍。日期字串為 `YYYY-MM-DD HH:MM:SS`（`datetime('now','localtime')`），字典序即時間序，故以字串比較即可。

## 任務清單

- [x] 新增排序狀態與持久化：`CARD_SORT_KEY = 'kanban-card-sort'`、`cardSort` 變數、`loadCardSort()`（驗證合法值，預設 `'default'`）、`saveCardSort()`、`setCardSort(value)`（存檔後 `render()`）
- [x] 實作 `sortCards(cards)`：`default` 直接回傳原陣列；否則複製後依 `field`/`dir` 排序 —— `updated`/`created` 以日期字串 `localeCompare` 乘 `sign`、`status` 依 `STATUSES` index 乘 `sign` 並以 `position` tie-break
- [x] `renderProjectView()` 卡片渲染（約 line 612）改為 `sortCards(p.cards.filter(matchesFilter))`，僅作用於專案視圖
- [x] header 加入**單一排序下拉** `<select id="cardSort">`，7 個選項（見描述表格），`onchange` → `setCardSort(this.value)`
- [x] 排序下拉只在專案視圖顯示：於 `updateViewSwitch()` 與初始化同步其顯示與選取值（切到狀態視圖時隱藏）
- [x] 加入對應 CSS，樣式與 `.view-btn` / header 風格一致、精簡
- [x] 手動驗證：7 個排序選項各自正確（含正/反序）；切換視圖後設定保留；重新整理後設定保留（localStorage）；空欄／單卡不報錯；排序與既有 status filter 並用正常
