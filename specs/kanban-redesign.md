# Kanban Redesign — Direction A「Calm」+ 明暗主題切換

- **分支:** `feat/kanban-redesign`
- **日期:** 2026-06-29

## 描述

依 claude.ai/design 設計專案「Kanban project redesign」的 **Direction A —「Calm」** 高保真設計稿,
將 `public/index.html` 由現有暖色「牛皮紙」風格全面改版為 sage 綠 + Mulish 字型的柔和風格,
並新增 **light / dark 雙主題**,在語言切換鈕右側加入主題切換鈕。

- 設計來源:`https://claude.ai/design/p/875877ec-dd08-4cc7-9af7-b22753077989?file=Kanban+Redesign.dc.html`
  （透過 DesignSync MCP 匯入;含 `design_handoff_kanban_direction_a/README.md` 交付規格)
- 設計稿為**視覺參考**,非逐字複製的程式碼 —— 以本 repo 既有架構（vanilla JS + CSS variables）重現視覺結果。

## 決策（已與使用者確認）

1. **保留現有 5 個狀態**（`active / pending / done / blocked / archived`）。只套用設計稿的視覺風格,
   **不**改狀態模型、**不**重建 DB、**不**動 REST API 與 `proj-kanban-api` skill 契約。設計稿的 4 欄狀態名只當示意。
2. **完整改版,保留所有功能**:看板（雙視圖）、卡片、欄、modal、header、footer 全面重做;
   保留兩個視圖、篩選 chips、拖曳、排序、GSAP 動畫、i18n。
3. **主題切換鈕**置於語言切換鈕**右側**(header 最右)。預設**跟隨系統** `prefers-color-scheme`,
   使用者切換後持久化到 `localStorage` `kanban-theme`(`light | dark`)。
4. **版面模型維持現況**:固定寬度欄 + 水平捲動(專案視圖可有任意多欄),不改成設計稿的等寬 flex 4 欄。
5. **欄背景隨主題**:light 欄無框（卡片浮在 board 底色上）、dark 欄為獨立 lane(`#1A1D21`),
   維持暗色三層 ramp:board → lane → card。
6. **字型**:Fraunces / Geist → `Mulish` + `Noto Sans TC`(UI 與標題皆用 Mulish,標題用較重字重）。

## 設計 token（Direction A）

### Light
- accent `#5C9A7B` / hover `#4F8A6C` / tint `#EAF1EC` / accent border `#BFD8C7`
- bg `#F7F7F5` / 卡片 `#FFFFFF` / 欄 lane 透明
- text `#1F2421` / text2 `#6B7269` / 專案標籤 `#7A8079` / muted `#A6ABA2`
- pill border `#EAE9E4` / input border `#E3E2DD` / 虛線 `#DAD9D3`
- 版本 chip 底 `#ECECE8` 字 `#AEB4AB` / danger 文字 `#C77A6B`
- 卡片陰影 `0 1px 2px rgba(31,36,33,.04),0 4px 14px rgba(31,36,33,.05)`;hover `0 2px 4px rgba(31,36,33,.06),0 12px 26px rgba(31,36,33,.09)`

### Dark（三層 surface ramp）
- board `#101214` → lane `#1A1D21`(radius 14)→ 卡片 `#272C32` / hover `#2F353C`
- accent `#79B596` / hover `#8AC4A5` / accent 上文字 `#11231A` / tint `#1E2E25`
- text `#ECEDEB` / text2 `#A2A89F` / muted `#7C837B`、`#6E746C`
- pill 底 `#21252A` 邊 `#2C3033` 字 `#B6BCB4` / 版本 chip 底 `#23262A` 字 `#7C837B`

### 共用
- 圓角:board 容器 20 / 卡片 14(light)11(dark)/ pill·input 9–10 / 按鈕 10 / 色票 9
- 間距:欄間距 16 / 卡片間距 11 / 卡片內距 14
- 專案色票(New Project,6 色):`#E8836B #E0A95B #7FB069 #4FB5A8 #5B8DEF #9B7BE0`

## 任務清單

- [x] 替換 Google Fonts 連結:移除 Fraunces/Geist,改載入 Mulish + Noto Sans TC
- [x] 改寫 `:root`(light)token,並新增 `[data-theme="dark"]` 一整套 dark token；`--font-*` 改 Mulish
- [x] 新增 `--col-bg` 等隨主題變數,使 light 欄無框、dark 欄為 lane
- [x] 重做 header:加入版本 chip、filter pill / 語言切換 / 按鈕的 sage 樣式
- [x] header 語言切換鈕**右側**加入主題切換鈕(☀/🌙),含 `data-i18n-title` 與兩語系文案
- [x] 重做卡片、欄、add-card / add-col、modal、footer chips、toast 的 sage 樣式 + 明暗適配
- [x] 5 個狀態 badge(`.status-*`)的 light/dark 配色適配
- [x] New Project 色票改為設計稿 6 色,選中態為 ring 樣式
- [x] JS:`theme` 狀態 + `setTheme()` + `toggleTheme()`,讀取/驗證 `localStorage` `kanban-theme`,
      預設 fallback `matchMedia('(prefers-color-scheme: dark)')`,設 `<html data-theme>` 並更新鈕狀態
- [x] 初始化時套用主題(避免 FOUC),並加入 `kanban-theme` 到 i18n title 文案(en / zh-TW 對稱)
- [x] 驗證:`node --check` 不報錯(hook 會跑);啟動 server 用 Playwright 檢查 light/dark 兩主題、
      雙視圖、modal、切換鈕持久化皆正常
- [x] 更新 `CLAUDE.md`「Things that will trip you up」加入主題系統說明（如有新增 localStorage key / 三處同步點）

## 驗證標準

- light 與 dark 兩主題在「專案視圖」「狀態視圖」、兩個 modal、空看板下視覺皆符合 Direction A。
- 主題切換鈕在語言鈕右側;切換即時生效、重整後保留;預設跟隨系統。
- 所有既有功能（篩選、拖曳、排序、GSAP、i18n、新增/編輯/刪除）行為不變。
- `node --check src/index.js` 通過;REST API 與 skill 契約未更動。
