# 新增「狀態視圖」+ 視圖切換 + 專案篩選 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在現有看板上新增「狀態視圖」(欄=狀態、卡片跨專案分組)、header 視圖切換、狀態視圖的專案篩選與卡片拖曳改狀態,且不動後端。

**Architecture:** 純前端,只改 `public/index.html`。現有 `render()` 抽成 `renderProjectView()`(行為不變),新增 `renderStatusView()`;`render()` 依 `currentView` 分流,共用 footer 與 `flipColHeights()`。狀態視圖用既有 `STATUSES`(固定 5 欄)把所有專案的卡片依 `status` 分組;footer chips 與拖曳行為依視圖切換。視圖選擇與兩套篩選各自持久化到 `localStorage`。

**Tech Stack:** Vanilla JS(無框架、無打包)、GSAP(僅既有的欄高動畫)、HTML drag-and-drop API、`localStorage`。後端為既有 Express + better-sqlite3,本計畫**完全不動**。

## Global Constraints

- **只修改 `public/index.html` 一個檔案。** `src/index.js`、DB schema、`.claude/skills/proj-kanban-api/` 文件皆不得修改(後端已支援所需 endpoint)。
- **無 build / 無 test runner / 無 linter。** 每個任務的「驗證」是**手動在瀏覽器操作 + 觀察 DevTools console 無錯誤**(本專案無自動化測試,不得自行引入測試框架)。靜態檔每次請求即時讀取,改完 `index.html` 只需**重新整理瀏覽器**,不需重啟 server。
- **沿用既有 vanilla JS 風格**:`const`/`let`、template literal 建 HTML、`esc()` 跳脫使用者輸入、modal 用 `.hidden` class、錯誤用 `toast()`。不引入框架、不重構無關程式碼。
- **localStorage key 必須精確**:視圖 `kanban-view`(預設 `'project'`);狀態篩選 `kanban-status-filter`(既有);專案篩選 `kanban-project-filter`(新增)。
- **狀態固定 5 種**,順序 active → pending → done → blocked → archived,來源為既有 `STATUSES` 常數(`public/index.html:403-409`)。
- 開啟網址:`http://localhost:10023/proj-kanban/`(路徑需與 server `BASE_PATH` 一致才能運作)。

---

## File Structure

唯一變更檔:`public/index.html`。新增/修改的 JS 符號:

- **新增**:`VIEW_KEY` / `currentView` / `loadView()` / `saveView()` / `switchView(view)` / `updateViewSwitch()`、`renderProjectView(board)`(由 `render()` 抽出)、`renderStatusView(board)`、`statusCardHTML(card, project)`、`PROJECT_FILTER_KEY` / `activeProjects` / `loadProjectFilter()` / `saveProjectFilter()` / `matchesProjectFilter(card)` / `toggleProject(id)` / `clearProjectFilter()`、`renderStatusChips()` / `renderProjectChips()`、`initStatusDragDrop()` / `dragCardId` / `findCard(id)`。
- **修改**:`render()`(改為分流)、`flipColHeights()`(改用 `data-col-key`)、`renderStatusBar()`(改為依視圖分派)、`openCardModal()`(加 `presetStatus` 參數與專案下拉)、`saveCard()`(讀專案下拉、PUT 帶 `project_id`)、header HTML(加視圖切換)、card modal HTML(加 `#cardProject` 下拉)、init 段(加 `updateViewSwitch()`)、`<style>`(加切換鈕 / 狀態欄標題 / 卡片專案標示 / chip dot / 卡片拖曳 樣式)。

---

## 前置作業(每個任務開始前都成立)

- [ ] **確認 server 在跑**:若尚未啟動,於專案根目錄執行 `npm run dev`(背景執行),瀏覽器開 `http://localhost:10023/proj-kanban/`。
- [ ] **確認有可驗證的資料**:看板至少有 **2 個專案**、且卡片**橫跨多種狀態**(例如各專案都有 active/done/pending 的卡)。不足時用 UI 先建立幾筆。
- [ ] 每次改完 `public/index.html` 後**重新整理瀏覽器**並打開 DevTools console;後續每個「驗證」步驟都隱含「console 無紅色錯誤」。

---

### Task 1: 重構 — 抽出 `renderProjectView()` + `render()` 分流骨架 + 視圖狀態

把現有看板渲染原封不動搬進 `renderProjectView()`,`render()` 改為依 `currentView` 分派(狀態視圖此時為空殼)。這是純重構,主要風險是「專案視圖行為跑掉」,值得獨立驗證。

**Files:**
- Modify: `public/index.html`(JS:新增視圖狀態區塊、改 `render()`、新增 `renderProjectView()`、改 `flipColHeights()`)

**Interfaces:**
- Consumes:既有 `state.projects`、`matchesFilter`、`cardHTML`、`initDragDrop`、`renderStatusBar`、`flipColHeights`、`openProjectModal`、`openCardModal`。
- Produces:`currentView`(`'project' | 'status'`,字串)、`loadView()` / `saveView()`、`renderProjectView(board)`、`renderStatusView(board)`(空殼)。欄位 DOM 新增 `data-col-key`(專案欄 = `'p' + p.id`)。

- [ ] **Step 1: 新增視圖狀態區塊**

在「Status filter」區塊之後(`public/index.html:457`,即 `matchesFilter` 函式的結尾 `}` 之後、`// ── Load ──` 之前)插入:

```js
// ── View (project | status) ─────────────────────────────────
const VIEW_KEY = 'kanban-view'
let currentView = loadView()

function loadView() {
  return localStorage.getItem(VIEW_KEY) === 'status' ? 'status' : 'project'
}

function saveView() {
  localStorage.setItem(VIEW_KEY, currentView)
}
```

- [ ] **Step 2: 把 `render()` 改為分流,並抽出 `renderProjectView()`**

將現有整個 `render()` 函式(`public/index.html:467-506`)取代為下列**兩個函式 + 一個空殼**:

```js
// ── Render ──────────────────────────────────────────────────
function render() {
  const board = document.getElementById('board')
  // capture current column heights so we can animate the frame when card count changes
  const prevColHeights = {}
  board.querySelectorAll('.col').forEach(col => { prevColHeights[col.dataset.colKey] = col.offsetHeight })
  board.innerHTML = ''

  if (currentView === 'status') renderStatusView(board)
  else renderProjectView(board)

  renderStatusBar()
  flipColHeights(board, prevColHeights)
}

// Project view — columns are projects (原本的看板,行為不變)
function renderProjectView(board) {
  state.projects.forEach(p => {
    const col = document.createElement('div')
    col.className = 'col'
    col.dataset.projId = p.id
    col.dataset.colKey = 'p' + p.id
    col.setAttribute('draggable', 'true')
    col.innerHTML = `
      <div class="col-header">
        <button class="drag-handle" title="拖曳排序">⠿</button>
        <div class="col-dot" style="background:${esc(p.color)}"></div>
        <div class="col-title" onclick="openProjectModal(${p.id})">${esc(p.name)}</div>
        <span class="col-count">${p.cards.length}</span>
        <div class="col-actions">
          <button class="icon-btn" title="編輯" onclick="openProjectModal(${p.id})">✎</button>
        </div>
      </div>
      <div class="col-body" id="col-${p.id}">
        ${p.cards.filter(matchesFilter).map(c => cardHTML(c)).join('')}
      </div>
      <button class="add-card-btn" onclick="openCardModal(${p.id})">＋ 新增更新</button>
    `
    board.appendChild(col)
  })

  // Add project column
  const addCol = document.createElement('div')
  addCol.className = 'add-col'
  addCol.innerHTML = `<button class="add-col-btn" onclick="openProjectModal()">＋ 新增專案欄</button>`
  board.appendChild(addCol)

  initDragDrop()
}

// Status view — columns are statuses (Task 3 實作)
function renderStatusView(board) {
  // placeholder — 後續任務填入
}
```

- [ ] **Step 3: `flipColHeights()` 改用 `data-col-key` 對位**

在 `flipColHeights()`(`public/index.html:510-523`)中,把這一行:

```js
    const from = prev[col.dataset.projId]
```

改為:

```js
    const from = prev[col.dataset.colKey]
```

- [ ] **Step 4: 驗證專案視圖無回歸**

重新整理瀏覽器(此時 `currentView` 預設 `'project'`)。依序確認:
- 看板與改動前外觀一致,所有專案欄與卡片正常顯示。
- footer 狀態 chips 可點、篩選動畫正常。
- 拖曳欄 header 的 `⠿` 重排專案順序,重整後順序保留。
- 新增 / 編輯卡片、新增 / 編輯專案都正常。
- console 無錯誤。

- [ ] **Step 5: 驗證分流骨架(狀態視圖空殼)**

DevTools console 執行:

```js
localStorage.setItem('kanban-view','status'); location.reload()
```

Expected:看板區域空白(空殼),footer 仍有 chips,**console 無錯誤**。再執行還原:

```js
localStorage.setItem('kanban-view','project'); location.reload()
```

Expected:專案看板恢復正常。

- [ ] **Step 6: Commit**

```bash
git add public/index.html
git commit -m "refactor(ui): extract renderProjectView and add view dispatch skeleton"
```

---

### Task 2: Header 視圖切換 UI

加入 segmented 切換鈕與其行為,讓使用者能在兩視圖間切換並持久化。

**Files:**
- Modify: `public/index.html`(`<style>` 加切換鈕樣式、`<header>` 加切換 UI、JS 加 `switchView`/`updateViewSwitch`、init 段)

**Interfaces:**
- Consumes:`currentView`、`saveView()`、`render()`。
- Produces:`switchView(view)`、`updateViewSwitch()`;DOM 新增 `.view-switch` / `.view-btn[data-view]`。

- [ ] **Step 1: 加切換鈕 CSS**

在 `.btn-sm { ... }`(`public/index.html:82`)之後插入:

```css
  .view-switch {
    display: inline-flex; gap: 2px; margin-left: 8px;
    background: var(--surface);
    border: 1px solid var(--border-st);
    border-radius: 10px; padding: 2px;
  }
  .view-btn {
    border: none; background: none; cursor: pointer;
    font-family: var(--font-body); font-size: 13px; font-weight: 500;
    color: var(--text2); padding: 5px 14px; border-radius: 8px;
    transition: all 140ms var(--ease);
  }
  .view-btn:hover { color: var(--text); }
  .view-btn.active { background: var(--surface2); color: var(--text); box-shadow: var(--shadow-sm); }
```

- [ ] **Step 2: 加切換 UI 到 header**

把 header(`public/index.html:331-336`)取代為:

```html
<header>
  <h1>📋 Project <span>Kanban</span></h1>
  <div class="view-switch" id="viewSwitch">
    <button class="view-btn" data-view="project" onclick="switchView('project')">專案視圖</button>
    <button class="view-btn" data-view="status" onclick="switchView('status')">狀態視圖</button>
  </div>
  <div class="header-actions">
    <button class="btn btn-primary" onclick="openProjectModal()">＋ 新增專案</button>
  </div>
</header>
```

- [ ] **Step 3: 加 `switchView` / `updateViewSwitch`**

在 `saveView()` 函式(Task 1 新增的視圖狀態區塊)之後插入:

```js
function switchView(view) {
  if (view === currentView) return
  currentView = view
  saveView()
  updateViewSwitch()
  render()
}

function updateViewSwitch() {
  document.querySelectorAll('.view-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === currentView)
  })
}
```

- [ ] **Step 4: init 段呼叫 `updateViewSwitch()`**

把檔案結尾的 init(`public/index.html:779-780`):

```js
// init
load()
```

改為:

```js
// init
updateViewSwitch()
load()
```

- [ ] **Step 5: 驗證切換**

重整瀏覽器。確認:
- header 有「專案視圖 / 狀態視圖」切換鈕,目前高亮在「專案視圖」。
- 點「狀態視圖」→ 高亮移動、看板變空白(空殼)。
- 重整 → 仍停在「狀態視圖」(高亮也對)。
- 點「專案視圖」→ 專案看板恢復。
- console 無錯誤。

- [ ] **Step 6: Commit**

```bash
git add public/index.html
git commit -m "feat(ui): add project/status view switch in header"
```

---

### Task 3: `renderStatusView()` — 卡片跨專案依狀態分組 + 專案標示

實作狀態視圖:固定 5 欄、空欄保留、卡片依 `status` 分組、每張卡顯示所屬專案(色點 + 名)。此任務**先不套專案篩選、不接拖曳**(分別在 Task 4、Task 5);欄底「＋新增」按鈕會出現,但完整可用要到 Task 6。

**Files:**
- Modify: `public/index.html`(JS:實作 `renderStatusView`、新增 `statusCardHTML`;`<style>` 加狀態欄標題 / 卡片專案標示樣式)

**Interfaces:**
- Consumes:`STATUSES`、`state.projects`、`esc()`、`openCardModal()`。
- Produces:`renderStatusView(board)`、`statusCardHTML(card, project)`;狀態欄 DOM 帶 `data-status`(狀態 key)、`data-col-key`(`'s-' + key`);狀態卡 DOM 帶 `draggable="true"`、`data-card-id`、`data-status`。

- [ ] **Step 1: 加狀態欄標題與卡片專案標示 CSS**

在狀態徽章區塊 `.status-archived { ... }`(`public/index.html:189`)之後插入:

```css
  /* Status view */
  .col-title-static {
    font-family: var(--font-head); font-size: 14px; font-weight: 500;
    letter-spacing: -.01em; flex: 1; color: var(--text);
  }
  .card-project { display: flex; align-items: center; gap: 6px; margin-bottom: 7px; }
  .card-project-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .card-project-name { font-size: 11px; font-weight: 600; color: var(--text2); }
```

- [ ] **Step 2: 實作 `renderStatusView()`**

把 Task 1 留下的空殼 `renderStatusView(board)`:

```js
// Status view — columns are statuses (Task 3 實作)
function renderStatusView(board) {
  // placeholder — 後續任務填入
}
```

取代為:

```js
// Status view — columns are statuses; cards grouped across all projects
function renderStatusView(board) {
  const byStatus = {}
  STATUSES.forEach(s => { byStatus[s.key] = [] })
  state.projects.forEach(p => p.cards.forEach(c => {
    if (byStatus[c.status]) byStatus[c.status].push({ card: c, project: p })
  }))

  STATUSES.forEach(s => {
    const items = byStatus[s.key]
    const col = document.createElement('div')
    col.className = 'col'
    col.dataset.status = s.key
    col.dataset.colKey = 's-' + s.key
    col.innerHTML = `
      <div class="col-header">
        <div class="col-title-static">${s.emoji} ${s.label}</div>
        <span class="col-count status-${s.key}">${items.length}</span>
      </div>
      <div class="col-body" id="status-col-${s.key}">
        ${items.map(it => statusCardHTML(it.card, it.project)).join('')}
      </div>
      <button class="add-card-btn" onclick="openCardModal(null, null, '${s.key}')">＋ 新增更新</button>
    `
    board.appendChild(col)
  })
}
```

- [ ] **Step 3: 新增 `statusCardHTML()`**

在 `cardHTML()` 函式(`public/index.html:649-662`)之後插入:

```js
function statusCardHTML(c, project) {
  const date = c.updated_at.slice(0,10)
  const memo = c.memo ? `<div class="card-memo">${esc(c.memo)}</div>` : ''
  return `
    <div class="card" draggable="true" data-status="${c.status}" data-card-id="${c.id}"
         onclick="openCardModal(${c.project_id}, ${c.id})">
      <div class="card-project">
        <span class="card-project-dot" style="background:${esc(project.color)}"></span>
        <span class="card-project-name">${esc(project.name)}</span>
      </div>
      <div class="card-title">${esc(c.title)}</div>
      <div class="card-meta">
        <span class="card-time">${date}</span>
      </div>
      ${memo}
    </div>`
}
```

- [ ] **Step 4: 驗證狀態視圖分組**

重整 → 切到「狀態視圖」。確認:
- 出現**固定 5 欄**:🟣 進行中 / 🟡 待處理 / 🟢 完成 / 🔴 卡住了 / ⚪ 封存;**沒有卡片的狀態欄也保留**(空欄)。
- 每欄 header 右側 count pill 帶該狀態配色,數字 = 該狀態(跨所有專案)的卡片數。
- 卡片正確落在對應狀態欄;同一狀態下混合來自不同專案的卡片。
- 每張卡片頂端顯示**專案色點 + 專案名**;點卡片會開啟編輯 modal。
- console 無錯誤。

> 註:欄底「＋新增」此刻先不驗證(專案下拉在 Task 6 才接);卡片拖曳在 Task 5 才接。

- [ ] **Step 5: Commit**

```bash
git add public/index.html
git commit -m "feat(status-view): render 5 status columns with cross-project cards"
```

---

### Task 4: 狀態視圖的專案篩選(footer chips 正交切換)

新增 `activeProjects` 篩選與其持久化;`renderStatusBar()` 依視圖切換 chips(專案視圖=狀態 chips;狀態視圖=專案 chips);把篩選套進 `renderStatusView()` 的分組。

**Files:**
- Modify: `public/index.html`(JS:新增專案篩選區塊、改 `renderStatusBar` 分派、改 `renderStatusView` 套篩選;`<style>` 加 chip dot)

**Interfaces:**
- Consumes:`state.projects`、`activeStatuses`、既有 `clearFilter` / `toggleStatus`、`render()`、`esc()`。
- Produces:`PROJECT_FILTER_KEY`、`activeProjects`(`Set`)、`loadProjectFilter()` / `saveProjectFilter()` / `matchesProjectFilter(card)` / `toggleProject(id)` / `clearProjectFilter()`、`renderStatusChips()` / `renderProjectChips()`。

- [ ] **Step 1: 加 chip dot CSS**

在 `.filter-chip .chip-count { ... }`(`public/index.html:325`)之後插入:

```css
  .filter-chip .chip-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
```

- [ ] **Step 2: 新增專案篩選區塊**

在 Task 1 新增的「View」區塊之後(`saveView()` 與 `switchView`/`updateViewSwitch` 之後)插入:

```js
// ── Project filter (status view, localStorage) ──────────────
const PROJECT_FILTER_KEY = 'kanban-project-filter'
let activeProjects = new Set(loadProjectFilter())

function loadProjectFilter() {
  try { return JSON.parse(localStorage.getItem(PROJECT_FILTER_KEY) || '[]') } catch { return [] }
}

function saveProjectFilter() {
  localStorage.setItem(PROJECT_FILTER_KEY, JSON.stringify([...activeProjects]))
}

function matchesProjectFilter(c) {
  return activeProjects.size === 0 || activeProjects.has(c.project_id)
}

function toggleProject(id) {
  if (activeProjects.has(id)) activeProjects.delete(id)
  else activeProjects.add(id)
  saveProjectFilter()
  render()
}

function clearProjectFilter() {
  if (activeProjects.size === 0) return
  activeProjects.clear()
  saveProjectFilter()
  render()
}
```

- [ ] **Step 3: `renderStatusBar()` 改為依視圖分派**

把現有 `renderStatusBar()`(`public/index.html:525-542`)取代為:

```js
function renderStatusBar() {
  if (currentView === 'status') renderProjectChips()
  else renderStatusChips()
}

function renderStatusChips() {
  const counts = {}
  let total = 0
  STATUSES.forEach(s => { counts[s.key] = 0 })
  state.projects.forEach(p => p.cards.forEach(c => {
    total++
    if (counts[c.status] !== undefined) counts[c.status]++
  }))
  const allChip = `
    <button class="filter-chip chip-all ${activeStatuses.size === 0 ? 'active' : ''}"
            onclick="clearFilter()">全部 <span class="chip-count">${total}</span></button>`
  const statusChips = STATUSES.map(s => `
    <button class="filter-chip status-${s.key} ${activeStatuses.has(s.key) ? 'active' : ''}"
            onclick="toggleStatus('${s.key}')">
      ${s.emoji} ${s.label} <span class="chip-count">${counts[s.key]}</span>
    </button>`).join('')
  document.getElementById('statusBar').innerHTML = allChip + statusChips
}

function renderProjectChips() {
  let total = 0
  state.projects.forEach(p => { total += p.cards.length })
  const allChip = `
    <button class="filter-chip chip-all ${activeProjects.size === 0 ? 'active' : ''}"
            onclick="clearProjectFilter()">全部 <span class="chip-count">${total}</span></button>`
  const projChips = state.projects.map(p => {
    const on = activeProjects.has(p.id)
    const style = on
      ? `style="color:${esc(p.color)}; background:color-mix(in oklab, ${esc(p.color)} 14%, transparent)"`
      : ''
    return `
    <button class="filter-chip chip-proj ${on ? 'active' : ''}" ${style}
            onclick="toggleProject(${p.id})">
      <span class="chip-dot" style="background:${esc(p.color)}"></span>${esc(p.name)} <span class="chip-count">${p.cards.length}</span>
    </button>`
  }).join('')
  document.getElementById('statusBar').innerHTML = allChip + projChips
}
```

- [ ] **Step 4: `renderStatusView()` 套用專案篩選**

在 `renderStatusView()` 的分組迴圈裡(Task 3 Step 2),把:

```js
  state.projects.forEach(p => p.cards.forEach(c => {
    if (byStatus[c.status]) byStatus[c.status].push({ card: c, project: p })
  }))
```

改為:

```js
  state.projects.forEach(p => p.cards.forEach(c => {
    if (!matchesProjectFilter(c)) return
    if (byStatus[c.status]) byStatus[c.status].push({ card: c, project: p })
  }))
```

- [ ] **Step 5: 驗證專案篩選**

重整 → 切到「狀態視圖」。確認:
- footer 變成**專案 chips**:每個 chip 有專案色點 + 專案名 + count(= 該專案卡片總數),最前面有「全部 N」。
- 點某個專案 chip → 只剩該專案的卡片(各狀態欄同步收斂)、chip 高亮(出現專案色外框/底色)、count pill 數字隨之更新。可多選(再點別的專案疊加)。
- 點「全部」→ 清除篩選,所有卡片回來。
- 重整 → 篩選保留。
- 切回「專案視圖」→ footer 回到**狀態 chips**且行為與原本一致(狀態篩選動畫正常)。
- console 無錯誤。

- [ ] **Step 6: Commit**

```bash
git add public/index.html
git commit -m "feat(status-view): add per-project filter chips"
```

---

### Task 5: `initStatusDragDrop()` — 拖曳卡片改狀態

狀態視圖中欄不可拖、卡片可拖;把卡片放到別的狀態欄即 `PUT /cards/:id { status }` 後 `load()`。

**Files:**
- Modify: `public/index.html`(JS:新增 `dragCardId` / `initStatusDragDrop` / `findCard`,`renderStatusView` 結尾呼叫 init;`<style>` 加 `.card.dragging`)

**Interfaces:**
- Consumes:`state.projects`、`api()`、`load()`、`toast()`、狀態欄 `data-status`、狀態卡 `data-card-id`、既有 `.drag-over` 樣式。
- Produces:`initStatusDragDrop()`、`findCard(id)`、`dragCardId`。

- [ ] **Step 1: 加卡片拖曳樣式**

在 `.col.dragging { opacity: 0.35; }`(`public/index.html:106`)之後插入:

```css
  .card.dragging { opacity: 0.4; }
```

- [ ] **Step 2: 新增 `initStatusDragDrop()` 與 `findCard()`**

在 `initDragDrop()` 函式結尾 `}`(`public/index.html:647`)之後插入:

```js
// Status-view card drag — drop a card on a status column to change its status
let dragCardId = null

function initStatusDragDrop() {
  const board = document.getElementById('board')

  board.querySelectorAll('.card').forEach(card => {
    card.addEventListener('dragstart', e => {
      e.stopPropagation()
      dragCardId = parseInt(card.dataset.cardId)
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', String(dragCardId))
      requestAnimationFrame(() => card.classList.add('dragging'))
    })
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging')
      board.querySelectorAll('.col').forEach(c => c.classList.remove('drag-over'))
      dragCardId = null
    })
  })

  board.querySelectorAll('.col').forEach(col => {
    col.addEventListener('dragover', e => {
      if (dragCardId === null) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      board.querySelectorAll('.col').forEach(c => c.classList.remove('drag-over'))
      col.classList.add('drag-over')
    })
    col.addEventListener('dragleave', e => {
      if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over')
    })
    col.addEventListener('drop', async e => {
      e.preventDefault()
      col.classList.remove('drag-over')
      if (dragCardId === null) return
      const id = dragCardId
      const newStatus = col.dataset.status
      const card = findCard(id)
      dragCardId = null
      if (!card || card.status === newStatus) return
      try {
        await api('PUT', `/cards/${id}`, { status: newStatus })
        load()
      } catch (err) { toast(err.message) }
    })
  })
}

function findCard(id) {
  for (const p of state.projects) {
    const c = p.cards.find(c => c.id === id)
    if (c) return c
  }
  return null
}
```

- [ ] **Step 3: `renderStatusView()` 結尾呼叫 init**

在 `renderStatusView()` 內 `STATUSES.forEach(...)` 迴圈結束後、函式結尾 `}` 之前,加一行:

```js
  initStatusDragDrop()
```

(即與 `renderProjectView()` 結尾的 `initDragDrop()` 對應;`render()` 透過呼叫對應的 view 函式間接呼叫對應的 init。)

- [ ] **Step 4: 驗證拖曳改狀態**

重整 → 切到「狀態視圖」,打開 DevTools 的 Network 分頁。確認:
- 把某張卡片從一欄拖到**另一個狀態欄**:目標欄出現 `.drag-over` 高亮;放下後送出 `PUT /api/cards/:id`(payload 含 `{ "status": "<新狀態>" }`),卡片移到新欄、兩欄 count 更新。
- 重整 → 卡片仍在新狀態(已寫入 DB)。
- 把卡片放回**原本同一欄** → 不送請求、無變化。
- 切回「專案視圖」→ 欄 header `⠿` 重排專案仍正常(狀態視圖的卡片拖曳沒污染專案視圖)。
- console 無錯誤。

- [ ] **Step 5: Commit**

```bash
git add public/index.html
git commit -m "feat(status-view): drag card between status columns to update status"
```

---

### Task 6: card modal 加「專案」下拉 + 跨專案新增 / 移動卡片

card modal 新增 `#cardProject` 下拉;`openCardModal` 加 `presetStatus` 參數與專案預選;`saveCard` 依新增/編輯走 POST(選定專案)或 PUT(可改 `project_id`)。完成後狀態視圖欄底「＋新增」與「編輯時移動卡片到別專案」皆可用。

**Files:**
- Modify: `public/index.html`(card modal HTML 加下拉、JS 改 `openCardModal` / `saveCard`)

**Interfaces:**
- Consumes:`state.projects`、`esc()`、`api()`、`load()`、`toast()`、`closeModal()`、`editing`、後端 `POST /projects/:id/cards`(已支援 `title`/`memo`/`status`)、`PUT /cards/:id`(已支援 `project_id ?? card.project_id`,見 `src/index.js:111-126`)。
- Produces:`openCardModal(projectId, cardId, presetStatus)`、`saveCard()`(讀 `#cardProject`);DOM 新增 `#cardProject` select。

- [ ] **Step 1: card modal 加專案下拉**

把 card modal 開頭(`public/index.html:368-373`):

```html
  <div class="modal">
    <h2 id="cardModalTitle">新增狀態更新</h2>
    <div class="form-group">
      <label>標題</label>
      <input id="cardTitle" type="text" placeholder="例：完成登入模組">
    </div>
```

取代為(在「標題」之前插入「專案」下拉):

```html
  <div class="modal">
    <h2 id="cardModalTitle">新增狀態更新</h2>
    <div class="form-group">
      <label>專案</label>
      <select id="cardProject"></select>
    </div>
    <div class="form-group">
      <label>標題</label>
      <input id="cardTitle" type="text" placeholder="例：完成登入模組">
    </div>
```

- [ ] **Step 2: 擴充 `openCardModal()`**

把 `openCardModal()`(`public/index.html:717-730`)取代為:

```js
function openCardModal(projectId, cardId, presetStatus) {
  const proj = state.projects.find(p => p.id === projectId)
  const card = cardId ? proj?.cards.find(c => c.id === cardId) : null
  editing = { type: 'card', id: cardId || null, projectId }

  // project dropdown — list every project
  const sel = document.getElementById('cardProject')
  sel.innerHTML = state.projects.map(p =>
    `<option value="${p.id}">${esc(p.name)}</option>`).join('')
  const preProjId = card ? card.project_id : (projectId ?? state.projects[0]?.id)
  if (preProjId != null) sel.value = String(preProjId)

  document.getElementById('cardModalTitle').textContent = card ? '編輯狀態更新' : '新增狀態更新'
  document.getElementById('cardTitle').value = card?.title || ''
  document.getElementById('cardMemo').value = card?.memo || ''
  document.getElementById('cardStatus').value = card?.status || presetStatus || 'active'
  document.getElementById('deleteCardBtn').classList.toggle('hidden', !card)

  document.getElementById('cardModal').classList.remove('hidden')
  setTimeout(() => document.getElementById('cardTitle').focus(), 50)
}
```

- [ ] **Step 3: 擴充 `saveCard()`**

把 `saveCard()`(`public/index.html:732-746`)取代為:

```js
async function saveCard() {
  const title = document.getElementById('cardTitle').value.trim()
  const memo  = document.getElementById('cardMemo').value.trim()
  const status = document.getElementById('cardStatus').value
  const projectId = parseInt(document.getElementById('cardProject').value)
  if (!title) return toast('請輸入標題')
  if (!projectId) return toast('請選擇專案')
  try {
    if (editing.id) {
      await api('PUT', `/cards/${editing.id}`, { title, memo, status, project_id: projectId })
    } else {
      await api('POST', `/projects/${projectId}/cards`, { title, memo, status })
    }
    closeModal('cardModal')
    load()
  } catch(e) { toast(e.message) }
}
```

- [ ] **Step 4: 驗證新增 / 移動卡片**

重整。確認以下情境:

**(a) 狀態視圖欄底新增(預填狀態 + 選專案):**
- 切到「狀態視圖」,點某欄(例如「🔴 卡住了」)的「＋新增」→ modal 開啟,**狀態**已預選為該欄(卡住了),**專案**下拉預設為第一個專案。
- 改選另一個專案、填標題、儲存 → 切到「專案視圖」確認該卡建在所選專案,且狀態為「卡住了」。

**(b) 編輯既有卡片可移動到別專案:**
- 任一視圖點一張既有卡片 → modal 的**專案**下拉預選為該卡原本專案。
- 改選不同專案 → 儲存 → 該卡移動到新專案(在「專案視圖」對應欄確認;送出的是 `PUT /api/cards/:id` 且 payload 含 `project_id`)。

**(c) 專案視圖新增不回歸:**
- 「專案視圖」某欄「＋新增更新」→ modal 的專案下拉預選該欄專案 → 填標題儲存 → 卡片建在該專案(行為與原本一致)。

- console 無錯誤。

- [ ] **Step 5: Commit**

```bash
git add public/index.html
git commit -m "feat(card-modal): add project dropdown for cross-project create/move"
```

---

### Task 7: 最終手動回歸驗證

整合驗證所有功能與「不回歸」,對應 spec 任務清單最後一項。本任務無程式碼變更。

**Files:** 無(僅驗證)。

- [ ] **Step 1: 視圖切換 + 持久化**
  - 切換兩視圖正常;重整後保留上次視圖;header 高亮與目前視圖一致。

- [ ] **Step 2: 專案視圖既有行為不回歸**
  - 狀態 chips 篩選(含進/退場動畫)正常;欄 header `⠿` 拖曳重排專案、重整保留;新增 / 編輯 / 刪除專案與卡片正常。

- [ ] **Step 3: 狀態視圖**
  - 固定 5 欄、空欄保留、分組正確;卡片顯示專案色點 + 名。
  - 專案 chips 篩選生效且持久化;「全部」可清除。
  - 拖曳卡片到別狀態欄 → 打 `PUT /cards/:id { status }`、畫面與 DB 反映、重整保留。
  - 欄底「＋新增」可選專案、預填欄狀態並成功建立。
  - 編輯卡片可移動到別專案。

- [ ] **Step 4: 兩套 filter 正交獨立**
  - 在狀態視圖設專案篩選、在專案視圖設狀態篩選,互不干擾;各自重整後保留(`kanban-project-filter` 與 `kanban-status-filter` 互不覆蓋)。

- [ ] **Step 5: console 全程無錯誤**;確認 `git status` 僅 `public/index.html`(與本計畫文件)被改,`src/index.js` 未被動到。

---

## 附註:後端為何不需修改(已查證)

- 拖曳改狀態 → `PUT /api/cards/:id`,只傳 `{status}` 安全:`src/index.js:119-123` 以 `title ?? card.title`、`status ?? card.status` 等 fallback 保留未傳欄位。
- 跨專案新增 → `POST /api/projects/:id/cards`(`src/index.js:98-108`,接受 `title`/`memo`/`status`)。
- 移動卡片改專案 → `PUT /api/cards/:id` 帶 `project_id`:`src/index.js:122` 用 `project_id ?? card.project_id`。
- 因此 `src/index.js`、DB schema、`proj-kanban-api` skill 文件皆不需修改。
