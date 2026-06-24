# 視圖切換與欄位進出動畫 — Walkthrough

- **分支:** `feat/view-switch-motion`
- **日期:** 2026-06-24

## 變更摘要

為看板的兩個「硬切」視覺事件加上動畫：**（1）在專案視圖與狀態視圖之間切換**，以及**（2）新增或刪除專案欄位**。這兩個事件原本都是即時重繪——畫面瞬間切換，缺乏空間感。**純前端，只改 `public/index.html`，後端／DB／API 文件完全未動。**

設計決策詳見 `docs/plans/2026-06-24-view-switch-motion-design.md`。

## 修改的檔案

- **`public/index.html`** — 唯一的程式碼變更，分 3 個 commit（Tasks 1–3）：

## 三個實作觸點

### 1. 視圖切換：`switchView()` + `render(opts)`（~L504、L567）

`switchView(view)` 觸發視圖切換。它先抓取目前看板裡所有 children（現有欄位加「新增欄」placeholder），再呼叫 `render({ viewSwitch: true })`。若 GSAP 可用，它在呼叫 `rerender` 之前先 **淡出** 目前欄位（`opacity 0, y -6, duration 0.16s, stagger 0.01s`），達到「舊視圖先退場」的效果：

```js
gsap.to(oldCols, {
  opacity: 0, y: -6, duration: .16, stagger: .01, ease: 'power2.out', onComplete: rerender,
})
```

`gsap.killTweensOf(oldCols)` 確保快速連點不會疊加 tween。GSAP 不可用時直接呼叫 `rerender()`。

`render(opts)` 完成渲染後，根據 `opts.viewSwitch` 決定後半段動畫：

- **有 `viewSwitch`：** 對新欄位做 **淡入**（`opacity 0 → 1, y 8 → 0, duration 0.28s, stagger 0.03s`），並完全跳過 `flipColHeights()`。原因：切換視圖會替換全部欄位，新欄的 `data-col-key`（專案欄 `'p<id>'`、狀態欄 `'s-<key>'`）與舊欄完全沒有交集，FLIP 動畫無從對位，強制進入 stagger 淡入。
- **無 `viewSwitch`（一般重繪）：** 呼叫 `flipColHeights()` 做高度動畫與新欄進場。

### 2. 新增欄位進場：`flipColHeights(board, prev)`（~L658）

每次一般 `render()` 後都呼叫此函式，逐欄比對 `prev` map（以 `data-col-key` 為 key，值為欄的 `offsetHeight`）：

- **已存在的欄：** 高度有明顯變化（≥2px）時，以 `gsap.fromTo` 在 `0.3s` 內補間舊高到新高（`h-anim` class 暫時取消 `overflow:hidden` 以允許動畫）。
- **colKey 不在 `prev`（新欄）：** 做 **進場動畫**（`opacity 0, y 6, scale 0.96, duration 0.28s`），但有兩道閘門：
  1. `hadColumns`（`Object.keys(prev).length > 0`）為 `false` 時跳過——首次渲染時 `prev` 是空的，不該讓每欄都觸發進場動畫。
  2. 視圖切換路徑走 `opts.viewSwitch` 分支，永遠不會進入此函式，因此不會重複觸發。

欄位新增只在**專案視圖**發生；狀態視圖的 5 個欄位固定不變。

### 3. 刪除欄位退場：`deleteCurrentProject()`（~L970）

確認刪除並完成 `DELETE /projects/:id` API 呼叫後，先以 `.col[data-proj-id="<id>"]` 定位目標欄位，再播放**退場動畫**（`opacity 0, scale 0.96, duration 0.2s`），動畫完成後才呼叫 `load()`：

```js
const col = document.querySelector(`.col[data-proj-id="${id}"]`)
if (window.gsap && col) {
  gsap.to(col, { opacity: 0, scale: .96, duration: .2, ease: 'power2.out', onComplete: load })
} else {
  load()
}
```

因為刪除按鈕（`#deleteProjectBtn`）只在專案視圖的 project modal 中出現，此欄位選擇器必定命中；GSAP 不可用時直接 `load()`。水平重排（其他欄位往左填位）刻意保持即時，不加動畫（設計決策，詳見設計文件）。

## 設計決策

- **收斂的動畫個性：** 全部動畫採 `ease: 'power2.out'`，時長 0.16–0.3s，無彈簧、無 overshoot——維持工具類應用的俐落感。
- **GSAP 缺席時的降級：** 三個觸點都包了 `if (window.gsap && ...)` / `else`，GSAP CDN 失敗或被封鎖時行為與改版前完全一致。
- **不處理 `prefers-reduced-motion`：** 與既有程式碼（如 `flipColHeights` 原本的高度補間）一致，維持風格統一，可日後統一加入。
- **欄位增刪限專案視圖：** 狀態視圖的 5 個狀態欄固定，不需要進出動畫。

## 開發流程

以 superpowers Subagent-Driven Development 執行——Task 1（視圖切換淡出淡入）、Task 2（新欄進場）、Task 3（刪欄退場）各由實作 subagent 完成後提交；Task 4 補充本文件。因本專案無 test runner，驗證採 `node --check` 語法 gate + Playwright 瀏覽器手動驗證。
