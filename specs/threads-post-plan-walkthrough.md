# Threads 貼文計畫（build in public）— Walkthrough

- **分支:** `docs/threads-post-plan`
- **日期:** 2026-07-01

## 變更摘要

為 proj-kanban 規劃一份 **Threads 社群貼文計畫**(build in public 定位),透過 brainstorming 流程與使用者逐步收斂:語言以**繁體中文為主**、目標為**個人品牌 / build in public**、形態為**單發主貼 + 留言串接龍**。產出兩份文件(計畫 + 操作手冊),並用 Playwright 實機截取本機看板,產出主貼配圖與一段「AI 透過 API 更新卡片」的 demo GIF。純內容/文件任務——`src/`、`public/`、REST API 與 DB schema **完全未動**。

## 修改的檔案

- **`docs/plans/2026-06-30-threads-post-plan-design.md`**(新增)— 貼文計畫本體:
  - 核心敘事(問題 / 概念 / build-in-public 過程)與轉發金句「給 AI 用的看板」。
  - Hook 角度決策表:**角度 A(反直覺好奇)當主貼**,角度 B(痛點)、C(過程)融入留言串。
  - Threads 觸及率原理 → 設計對應表(第一行預覽、留言權重、外部連結降觸及、黃金一小時、視覺、金句)。
  - 主貼完整文案 + 留言串 4 則逐則文案 + 發文執行清單 + 成效指標。
- **`docs/plans/2026-06-30-threads-post-runbook.md`**(新增)— 操作手冊:以 **T=0** 為原點的時間軸,分 5 階段(備料 T-1d / 投放 T=0 / 黃金一小時 T+60m / 第一天 / 復盤與系列化),每步拆 **When / What / Why**,末附一頁速查清單。
- **`specs/threads-post-plan-walkthrough.md`**(新增)— 本文件。
- **`threads-assets/`**(未納入版控,刻意 untracked)— Playwright 產出的視覺素材:
  - `shot-project-dark.png` / `shot-project-light.png` — 主貼 hero 候選(深/淺色專案視圖)。
  - `shot-status-dark.png` — 概念說明圖(狀態視圖,卡片標所屬專案)。
  - `kanban-agent-update.gif` — 留言 2 的 demo,卡片經 API 從「進行中」跳到「完成」並高亮。

## 內容/決策細節

- **語言、目標、形態**由 brainstorming 逐一提問定案(繁中為主 / 個人品牌 / 單發主貼 + 接龍),而非預設。
- **一篇同時做三件事**:角度 A 衝觸及(curiosity gap 拉停留 + 留言),角度 B/C 收進留言串補痛點與過程深度,兼顧衝量與立人設。
- **連結策略**:主貼零連結(避免降觸及),連結只放留言 4 與個人檔案。
- **GIF 走「API 驅動 + 看板自重繪」而非人手拖曳**:更貼合「AI 自己更新」敘事,且 status view 的原生 HTML5 DnD 不易由 Playwright 合成滑鼠穩定觸發。用單一專案篩選(🤖 AI Integration)讓卡片移動更清楚,示範後將卡片(id=11)還原為 active,保持 demo 資料不變。
- **`threads-assets/` 刻意不 commit**:避免二進位素材(截圖/GIF,約 4.5MB)進入 repo 歷史;檔案留在工作目錄供取用,可隨時刪除。

## 驗證

- ✅ 本機以 `npm start` 起 server(`:10023/proj-kanban/`),既有 demo 資料(6 專案 / 45 卡,含 active/pending/done/blocked)構成真實開發看板畫面。
- ✅ Playwright(headless,`deviceScaleFactor:2`)產出 3 張截圖:深/淺色專案視圖、深色狀態視圖(繁中),抽影格檢視均正確。
- ✅ GIF 前/後影格驗證:進行中欄 3→2、完成欄 1→2,「Build agent tool loop」移入完成欄並帶綠色高亮、日期自動更新為當日;ffmpeg(palette + lanczos)轉出 960px、15fps、80 frames、2.6MB。
- ✅ 示範用卡片已還原為 `active`;收尾停掉背景 server。
