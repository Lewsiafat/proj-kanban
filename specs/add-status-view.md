# 新增「狀態視圖」+ 視圖切換 + 專案篩選

- **分支:** `feat/add-status-view`
- **日期:** 2026-06-23

## 描述

在現有看板上**新增第二種視圖**:

- **專案視圖(現況)**:欄位 = 專案,每欄放該專案的卡片;footer 以「狀態」篩選。
- **狀態視圖(新增)**:欄位 = 狀態(進行中 / 待處理 / 完成 / 卡住了 / 封存),每欄放**跨所有專案**屬於該狀態的卡片(看板轉置);footer 以「專案」篩選。

兩種視圖並存,header 放一個切換鈕,選擇記在 `localStorage`。狀態視圖的卡片因為跨專案混排,卡片上加「專案顏色點 + 專案名」標示。狀態視圖支援**把卡片拖曳到別的狀態欄即改該卡狀態**;欄底「＋新增」會開卡片 modal,並新增「專案」下拉以選定卡片要建在哪個專案。

**範圍:純前端,只修改 `public/index.html`。** 後端 / DB / API 不變。

## 設計決策

### 視圖切換
- Header 加 segmented 切換(專案視圖 / 狀態視圖),狀態存前端變數 `currentView` 並持久化到 `localStorage`(key `kanban-view`),預設 `project`。重整後保留上次視圖。
- 現有 `render()` 內的看板渲染抽成 `renderProjectView()`(行為完全不變);新增 `renderStatusView()`;`render()` 依 `currentView` 分流,共用 footer 與 `flipColHeights()`。

### 狀態視圖渲染
- 欄位 = 既有 `STATUSES` 陣列(固定 5 欄,順序 active → pending → done → blocked → archived)。欄 header 用該狀態的 emoji / label,顏色沿用 `.status-*` 配色;欄即使沒有卡片也保留(空欄)。
- 卡片來源:把所有專案的 `cards` flatten 後依 `status` 分組。
- 卡片在狀態視圖需顯示**所屬專案**(專案顏色點 + 專案名),因為跨專案混排;點卡片仍開卡片 modal 編輯(沿用 `openCardModal`)。
- 欄 `col-count` = 該狀態(經專案篩選後)的卡片數。

### Filter — 正交式
- footer chips 依視圖切換維度,兩套各自獨立持久化:
  - **專案視圖** → 維持現有「狀態 chips」(`activeStatuses`,key `kanban-status-filter`),行為不變。
  - **狀態視圖** → 改為「專案 chips」(`activeProjects`,key `kanban-project-filter`),chip 用專案顏色,count = 各專案卡片數,最前面一樣有「全部 N」鈕。
- 切換視圖時 footer 重畫對應的 chips。
- 取捨:現有 `applyFilter()` 的逐卡進/退場動畫與 `STATUSES`/`dataset.status` 綁得很死。為避免過度工程,**狀態視圖的專案篩選切換採直接 `render()` 重畫**(仍享有 `flipColHeights()` 的欄高漸進),不強做逐卡 fade;專案視圖的狀態篩選維持現有動畫。

### 拖曳行為(依視圖分流)
- **專案視圖**:維持現有「拖曳欄 = 重排專案順序」(`dragSrcIdx` + `kanban-col-order`),行為不變。
- **狀態視圖**:欄(狀態)本身不可拖;**卡片可拖**,放到某狀態欄時若該卡 `status` 不同 → `PUT /cards/:id { status }` → `load()`。新增 `initStatusDragDrop()` 對應現有 `initDragDrop()`,`render()` 依視圖呼叫對應的 init;drop 高亮沿用 `.drag-over`。

### 新增 / 移動卡片(card modal 加專案下拉)
- card modal 新增「專案」下拉 `#cardProject`,列出所有專案。
- `openCardModal` 擴充:支援預選專案、以及一個 `presetStatus` 參數(狀態視圖欄底新增時預填該欄狀態);編輯既有卡片時下拉預選 `card.project_id`。
- `saveCard`:
  - 新增 → 依下拉選定的專案 `POST /projects/:projectId/cards`。
  - 編輯 → `PUT /cards/:id` 帶 `project_id`(已支援),等於順便能將卡片**移動到別的專案**。
- 狀態視圖每欄底部「＋新增」→ `openCardModal(null, null, 該欄狀態)`。

### 為何後端不動
- 拖曳改狀態 → 現有 `PUT /cards/:id`(只傳 `{status}` 安全:後端以 `?? card.x` fallback 保留其他欄位)。
- 跨專案新增 → 現有 `POST /projects/:id/cards`。
- 移動卡片改專案 → 現有 `PUT /cards/:id { project_id }`。
- 因此 `src/index.js`、DB schema、`proj-kanban-api` skill 文件**皆不需修改**。

## 任務清單

- [x] 加入 `currentView` 狀態與 `loadView()` / `saveView()`(localStorage key `kanban-view`,預設 `project`)。
- [x] Header 加視圖切換 UI(專案視圖 / 狀態視圖),切換時 `saveView()` + `render()`;加對應樣式。
- [x] 將現有看板渲染抽成 `renderProjectView()`(行為不變);`render()` 改為依 `currentView` 分流並共用 footer / `flipColHeights()`。
- [x] 實作 `renderStatusView()`:固定 5 個狀態欄(emoji/label/色、空欄保留)、卡片跨專案依狀態分組、卡片顯示所屬專案(色點 + 名)。
- [x] 加入專案篩選狀態 `activeProjects`(Set)與 `loadProjectFilter()` / `saveProjectFilter()`(key `kanban-project-filter`)及 `matchesProjectFilter(card)`。
- [x] `renderStatusBar()` 依視圖切換 chips:專案視圖=狀態 chips(現有);狀態視圖=專案 chips(專案色、count=各專案卡片數、「全部」鈕、可多選切換)。
- [x] 實作 `initStatusDragDrop()`:狀態視圖卡片可拖,drop 到狀態欄 → `PUT /cards/:id { status }` → `load()`;`render()` 依視圖呼叫 `initDragDrop()` 或 `initStatusDragDrop()`。
- [x] card modal 加「專案」下拉 `#cardProject`;`openCardModal` 支援 `presetStatus` 與專案預選;`saveCard` 依新增/編輯走 POST(選定專案)或 PUT(可改 `project_id`)。
- [x] 狀態視圖欄底「＋新增」→ `openCardModal(null, null, 該欄狀態)`。
- [x] 初次載入套用持久化的 `currentView` 與兩套 filter(chip 高亮與卡片顯示一致)。
- [x] 手動驗證:視圖切換 + 重整保留;專案視圖既有行為(狀態篩選 / 欄重排 / 新增編輯)不回歸;狀態視圖 5 欄分組正確並顯示專案、專案篩選生效、拖曳改狀態打 API 並反映、欄底可選專案新增、編輯可移動卡片到別專案。
