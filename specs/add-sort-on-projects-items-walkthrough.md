# 專案欄卡片自動排序 — Walkthrough

- **分支:** `feat/add-sort-on-projects-items`
- **日期:** 2026-06-26

## 變更摘要

為**專案視圖**的每個專案欄加上「卡片自動排序」。在 header 放一個**單一下拉選單**，把「排序欄位 × 正/反序」直接展開成 7 個選項；選擇全看板共用一組設定並持久化到 `localStorage`。**純前端，只改 `public/index.html`，後端／DB／API 完全未動。**

排序為純前端唯讀操作——只改變每欄卡片的渲染順序，不寫回 `cards.position`，也不呼叫任何 API。設計與選項決策詳見 `specs/add-sort-on-projects-items.md`。

## 修改的檔案

- **`public/index.html`** — 唯一的程式碼變更（+61 / −1），分四個觸點：CSS、header 下拉、排序狀態與邏輯、渲染套用。

## 七個排序選項

| 下拉選項 | 內部值 | 行為 |
|---|---|---|
| 預設 | `default` | 原始 `position, id` 順序（後端回傳序，直接回傳原陣列） |
| 更新時間（新→舊） | `updated-desc` | 依 `updated_at` 由新到舊 |
| 更新時間（舊→新） | `updated-asc` | 依 `updated_at` 由舊到新 |
| 建立時間（新→舊） | `created-desc` | 依 `created_at` 由新到舊 |
| 建立時間（舊→新） | `created-asc` | 依 `created_at` 由舊到新 |
| 狀態（正序） | `status-asc` | 依 `STATUSES` 順序（進行中→待處理→完成→卡住了→封存），同狀態內以 `position` tie-break |
| 狀態（反序） | `status-desc` | `STATUSES` 反序 |

## 四個實作觸點

### 1. 排序下拉 UI：`<select id="cardSort">`（~L372）＋ `.sort-select` CSS（~L97）

下拉放在 header 的 view-switch 與 `.header-actions` 之間，沿用 view-switch 的視覺語言（`--surface` 底、`--border-st` 框、`10px` 圓角）。`onchange` 直接呼叫 `setCardSort(this.value)`。CSS 僅新增 `.sort-select` 與其 `:hover`，保留原生下拉箭頭以求精簡。

### 2. 排序狀態與持久化（~L555）

```js
const CARD_SORT_KEY = 'kanban-card-sort'
const CARD_SORTS = ['default','updated-desc','updated-asc','created-desc','created-asc','status-asc','status-desc']
let cardSort = loadCardSort()
```

`loadCardSort()` 讀 `localStorage` 並用 `CARD_SORTS.includes()` 驗證合法值，非法或不存在一律回 `'default'`。`setCardSort(value)` 同樣驗證後寫回 `localStorage` 並呼叫 `render()` 重繪。與既有的 view / filter / 欄位順序一致——**全部狀態存前端，後端不知情**。

### 3. 排序邏輯：`sortCards(cards)`（~L574）

```js
function sortCards(cards) {
  if (cardSort === 'default') return cards
  const [field, dir] = cardSort.split('-')
  const sign = dir === 'asc' ? 1 : -1
  const arr = [...cards]
  if (field === 'status') {
    arr.sort((a, b) =>
      sign * ((STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)) || a.position - b.position)
  } else {
    const key = field === 'updated' ? 'updated_at' : 'created_at'
    arr.sort((a, b) => sign * a[key].localeCompare(b[key]))
  }
  return arr
}
```

- 單一字串 `field-dir` 以 `split('-')` 拆解，`sign` 統一套到比較結果上翻轉方向，省去每個選項各寫一段。
- 時間欄位是 `'YYYY-MM-DD HH:MM:SS'` 字串（`datetime('now','localtime')` 產生），字典序即時間序，故直接 `localeCompare` 不需轉 `Date`。
- `status` 以 `STATUS_ORDER`（`STATUSES` 預先轉成 `{key: index}`）排序，同狀態內以 `position` 為次序；未知狀態 fallback 到 `99`。
- `'default'` 直接回傳原陣列（不複製、不排序）；其餘分支以 `[...cards]` 複製後排序，**不就地改動 `state.projects`**。

### 4. 渲染套用（~L672，僅專案視圖）

`renderProjectView()` 的卡片渲染從 `p.cards.filter(matchesFilter)` 改為 `sortCards(p.cards.filter(matchesFilter))`——先套既有 status filter，再排序。`renderStatusView()` 不動：狀態視圖本就依狀態分群，排序不適用。

下拉的「只在專案視圖顯示」由 `updateViewSwitch()`（~L546）承擔：每次切換視圖與初始化都會 `classList.toggle('hidden', currentView !== 'project')` 並同步 `sortEl.value = cardSort`，所以 reload 後下拉會自動還原成已存的選擇。

## 邊界與限制

- 排序只作用於**專案視圖**；狀態視圖維持依狀態分群、不套排序。
- 排序是前端渲染序，**不持久化到 `cards.position`**；新增卡片仍以 `MAX(position)+1` 落在 `default` 序的末端。
- **未新增任何 card status**，只是依既有 `STATUSES` 排序，故不觸及 CLAUDE.md 的「status 三處同步」規則。

## 驗證

以 Playwright 載入頁面、對「網站重構」欄逐一切換 7 個選項，比對 DOM 卡片順序與預期：

- 7 個排序選項（含正/反序）DOM 順序**全部與預期一致**。
- 排序下拉在專案視圖顯示、狀態視圖隱藏。
- 設成 `status-asc` 後 reload，下拉值與卡片順序皆正確還原（localStorage 持久化）。
- inline `<script>` 抽出跑 `node --check` → 無語法錯誤。
