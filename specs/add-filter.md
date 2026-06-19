# 依狀態篩選卡片 + 底部狀態統計列

- **分支:** `feat/add-filter`
- **日期:** 2026-06-18

## 描述

在 board 底部把現有的單一「待處理」徽章擴充成 **5 個狀態 chip**（進行中 / 待處理 / 完成 / 卡住了 / 封存），每個 chip 顯示該狀態跨所有專案的卡片總數，並且本身就是篩選按鈕。點擊 chip 以**多選切換**方式篩選整個 board，只顯示符合狀態的卡片。篩選切換時加上 GSAP 轉場讓畫面不突兀。

**範圍：純前端，只修改 `public/index.html`。** 後端 / DB / API 不變（狀態本來就是開放字串，篩選為客戶端行為）。

### 設計決策

- **全域篩選**：作用於整個 board，所有專案欄一起套用。
- **多選切換**：每個 chip 獨立開/關，可同時開啟多個狀態；全部關閉 = 顯示全部。開啟中的 chip 高亮（填色 + ring）。
- **「全部」按鈕**：狀態列最前面放一個「全部 N」chip（N = 全部卡片總數）。無篩選時它高亮；點任一狀態時它變回未選；點它則清空所有篩選回到顯示全部。
- **數字永遠是總數**：chip 上的數字反映該狀態跨所有專案的卡片總數，不受目前篩選影響。
- **不隱藏空欄**：篩選後不符合的卡片隱藏，但專案欄一律保留，避免版面跳動。
- **每欄 `col-count` 不變**：仍顯示該專案卡片總數（與篩選無關）。
- **持久化**：`activeStatuses` 存入 `localStorage`（key `kanban-status-filter`），與現有 `kanban-col-order` 做法一致，重整後保留。
- **動畫只在篩選切換時觸發**，不走每次資料變動的全量 `render()`，避免每次新增/編輯卡片都重新播放動畫。
- **只動可見性改變的卡片**：切換時僅對「新被隱藏」的卡片播退場、對「新出現」的卡片播進場；可見性沒變的卡片完全不動，避免動畫結束後留下的位移漂移。
- **進場期間關閉 CSS transition**：`.card` 本身有 `transition: transform`，會跟在 gsap 後面慢 140ms 收尾、造成動畫結束後再往上跳一下。進場時對該卡片加 `.anim`（`transition:none`）讓位移純由 gsap 控制，完成後移除以恢復 hover 的 transition。
- **GSAP 漸進增強**：透過 CDN 載入 `gsap` core（與現有 Google Fonts CDN 一致的做法）。若 `window.gsap` 不存在（CDN 失敗 / 離線），自動退回無動畫直接重畫，功能不受影響。
- **欄位外框高度 FLIP**：卡片增減（篩選 / 新增 / 刪除）造成欄位高度改變時，先量測舊高與新自然高度，再 `gsap.fromTo(舊高 → 新高)` 平滑漸進，結束 `clearProps:'height'` 回到 `auto`。掛在 `render()` 內，所以三種情境共用；初次載入與拖曳排序因高度未變會自動略過。動畫期間對該欄加 `.h-anim`（`col-body` overflow 隱藏）避免閃出捲軸。
- **欄內個別卡片補位不做 FLIP**：欄位「外框高度」會漸進，但欄內剩餘卡片往上補位的個別位移仍為瞬間（避免引入 GSAP Flip plugin），靠退場/進場的淡入淡出與外框高度漸進來柔化。

### 轉場行為（篩選切換時）

1. 比較切換前後的可見狀態，算出「新被隱藏」與「新出現」的狀態。
2. **退場**：DOM 中將被隱藏的卡片純淡出 `gsap.to(..., {opacity:0, duration:.16, stagger:.015})`（不帶位移）。
3. 退場完成後重畫 board（套用新篩選）。
4. **進場**：只對「新出現狀態」的卡片 `gsap.from(..., {opacity:0, y:8, duration:.26, stagger:.02, ease:'power2.out', clearProps:'all'})`；可見性未變的卡片不動。
5. 若無 GSAP，略過動畫直接重畫。

## 任務清單

- [x] 在 `<head>` 以 CDN `<script>` 載入 GSAP core（`gsap.min.js`）。
- [x] 移除 footer 內的 `#pendingBadge`，改放狀態 chip 容器（`#statusBar`），保留左側品牌字與右側版本號。
- [x] 新增 `.filter-chip` 與其 active/inactive 樣式（沿用 `.status-*` 配色，active 加填色 + ring）。
- [x] 新增前端狀態 `activeStatuses`（Set）與 `loadFilter()` / `saveFilter()`（localStorage key `kanban-status-filter`）。
- [x] 把 `updateFooter()` 改寫為 `renderStatusBar()`：計算 5 狀態總數並渲染可點 chip，依 `activeStatuses` 標記高亮。
- [x] 在 `render()` 渲染卡片處加入篩選：`p.cards.filter(c => activeStatuses.size === 0 || activeStatuses.has(c.status))`。
- [x] 在狀態列最前面加入「全部 N」chip 與 `clearFilter()`（清空 `activeStatuses` 回到顯示全部）。
- [x] 新增 `toggleStatus(status)`：快照舊狀態 → 切換 `activeStatuses` → `saveFilter()` → 執行帶轉場的篩選套用。
- [x] 實作篩選套用函式 `applyFilter(before)`：算出進/退場狀態 → 退場淡出 → 重畫 → 只對新出現卡片進場；無 GSAP 時直接重畫（漸進增強）。
- [x] 在 `render()` 內掛 `flipColHeights(board, prev)`：量測重畫前後欄位高度，對高度有變者 `gsap.fromTo` 漸進，`.h-anim` 期間隱藏 `col-body` overflow。
- [x] 初次載入時套用持久化的篩選狀態（chip 高亮與卡片顯示一致）。
- [x] 手動驗證：多選切換、全部關閉還原、重整後保留、各 chip 數字正確、CDN 失敗時仍可篩選。
