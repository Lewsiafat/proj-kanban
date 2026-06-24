# 設計：切換視圖 / 欄位增刪的過場動態

日期：2026-06-24
範圍：frontend-only，全部在 `public/index.html`。不動 `src/index.js`、DB schema、`proj-kanban-api` skill。

## 目標

把兩個目前「硬切」的視覺事件變成順滑過場：

1. **切換視圖**（專案視圖 ↔ 狀態視圖）：目前 `switchView()` → `render()` 直接 `board.innerHTML = ''` 重畫，完全沒有過場。
2. **新增 / 刪除專案欄**：目前新增欄直接冒出、刪除欄直接消失。

狀態視圖固定 5 欄、不能增刪，故第 2 點只作用在**專案視圖**。

## 調性（決策）

- 沿用既有 GSAP 3.12.5 與 `power2.out`、0.16–0.3s 的時間家族，**無 overshoot**（「克制但順滑」）。
- 與現有 `flipColHeights()`／`applyFilter()` 的「先動畫再重畫」idiom 一致。
- 所有動畫包在 `if (window.gsap)` 內，GSAP 缺席時自動退回現有瞬間行為。

## 設計

### 1. 切換視圖過場（Approach A：淡出 → 重畫 → 交錯淡入）

改 `switchView()`，仿 `applyFilter()`：

```
switchView(view):
  view === currentView → return            // 既有 guard
  currentView = view; saveView(); updateViewSwitch()
  oldCols = [...board.children]
  if gsap && oldCols.length:
     gsap.killTweensOf(oldCols)             // 防快速連點殘留
     gsap.to(oldCols, { opacity:0, y:-6, duration:.16, stagger:.01,
                        onComplete: () => render({ viewSwitch:true }) })
  else render({ viewSwitch:true })
```

`render(opts = {})` 多收一個 `opts.viewSwitch`：

- `viewSwitch` 為真 → 重畫後對新欄
  `gsap.from(cols, { opacity:0, y:8, duration:.28, stagger:.03, ease:'power2.out', clearProps:'all' })`，
  並**跳過** `flipColHeights`（兩視圖 colKey 全異，FLIP 本就無作用，且避免與這段重複觸發）。
- 否則維持現狀，照常呼叫 `flipColHeights(board, prevColHeights)`。

其餘 render 觸發路徑（卡片增刪、篩選、reorder）行為不變。

### 2. 新增欄

把 `flipColHeights()` 由「只補間高度」升級為「frame 變化動畫」，複用 `render()` 既有的 `prevColHeights`：

- colKey **在** `prev` 且高度改變 → 維持現有高度補間（不變）。
- colKey **不在** `prev`（真正的新欄）→ 進場
  `gsap.from(col, { opacity:0, y:6, scale:.96, transformOrigin:'top center', duration:.28, ease:'power2.out' })`。
- **守則**：`prev` 為空（首次載入，全部都算「新」）→ 整段進場跳過，**不做首載動畫**（未被要求，保持 surgical）。view-switch 走另一分支，也不會誤觸。

辨識原理：「colKey 不在 prev 且 prev 非空」精準對應「真正新增了一欄」，天然避開首載與切換視圖。

### 3. 刪除欄

仿 `applyFilter`，在 `deleteCurrentProject()` reload 前先讓該欄退場：

```
id = editing.id
await api DELETE; closeModal
col = .col[data-proj-id=id]
if gsap && col: gsap.to(col, { opacity:0, scale:.96, duration:.2, ease:'power2.out', onComplete: load })
else load()
```

退場後其餘欄的**水平**遞補維持瞬間（與現有「reflow is instant by design」一致，不在本次範圍）。

## 邊界

- **GSAP 缺席**：每段皆有 fallback，退回現狀。
- **快速連點切換**：`killTweensOf` + render wipe 舊節點，避免殘影。
- **`prefers-reduced-motion`**：現有程式碼完全未處理，本次**維持一致、不額外加**（已與使用者確認）。

## 驗證

專案無測試／linter，且 `check-src-syntax.sh` hook 只檢查 `src/index.js`（不含 `index.html`），故靠手動 + Playwright：

- 啟動 server，用 Playwright 腳本：連續切換視圖、新增一欄、刪除一欄；確認 console 無錯、畫面有過場、最終 DOM 正確；截圖佐證。
- 比照前幾個功能，最後補一份 `specs/view-switch-motion-walkthrough.md`。
