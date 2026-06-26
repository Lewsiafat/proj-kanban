# 雙語 i18n（英文預設 / 繁中切換）+ 文件英文化 — Walkthrough

- **分支:** `feat/i18n-en-default`
- **日期:** 2026-06-26

## 變更摘要

為看板 app UI 加入零框架的國際化（i18n）：**預設英文**，header 一鍵切換**繁體中文（zh-TW）**，選擇持久化於 `localStorage`。同步將面向使用者的文件（README、CHANGELOG）改為英文預設並新增繁中版，頂部互鏈語言切換列。

## 修改的檔案

- **`public/index.html`** — i18n 核心：新增 `I18N`（`en` / `zh-TW` 兩語系、42 個對稱 key）與 `t()` helper；靜態標記改用 `data-i18n` / `data-i18n-placeholder` / `data-i18n-title` 由 `applyStaticI18n()` 套用；`#cardStatus` 選項由 `buildStatusOptions()` 依 `STATUSES` 動態建立；`STATUSES` 標籤改為 locale-aware（`statusLabel()`）；所有動態渲染（卡片徽章、modal 標題、toast、confirm、篩選 chip、排序選項）改走 `t()`；header 新增 `EN | 繁中` 段控切換鈕並由 `setLang()` 驅動。語言鈕置於 `.header-actions` 內、`New Project` 之後（靠右）。`<html lang>` 由 `zh-Hant` 改為預設 `en`。
- **`README.md`** — 改為全英文預設，移除原中文 blockquote 註記，`功能` → `## Features`（含新增的雙語 UI 條目）；H1 下方加語言切換列 `**English** · [繁體中文](./README.zh-TW.md)`。
- **`README.zh-TW.md`**（新增）— README 的完整繁中版，結構/程式碼區塊/表格與英文版一致，切換列指回 `README.md`。
- **`CHANGELOG.md`** — 加語言切換列；新增 `## [Unreleased]` → `### Added` 的 i18n 條目。
- **`CHANGELOG.zh-TW.md`**（新增）— 整份 changelog 的繁中翻譯，版號/日期/連結與英文版 byte-identical。

## 技術細節

- **預設英文 + 持久化**：`let lang = localStorage.getItem('kanban-lang'); if (lang !== 'zh-TW') lang = 'en'`。`setLang(l)` 寫入 `kanban-lang`、更新 `document.documentElement.lang`（`en` / `zh-Hant`）、`applyStaticI18n()`、`updateLangSwitch()`、`render()`，因此動態內容即時換語言、reload 後維持選擇。
- **`t()` 三層 fallback**：目前語系 → `en` → 原始 key，缺字不會壞畫面。兩語系 key 集合對稱（42 個）。
- **行為零變更**：拖曳排序、各視圖篩選、卡片排序、GSAP 過場、REST 呼叫、其餘 `localStorage` key（order/filter/view/sort）皆未更動，僅新增 `kanban-lang`。
- **文件範圍**：僅處理面向使用者的 `README` / `CHANGELOG`（英文預設 + 繁中版）。`specs/`、`docs/`、`.claude/` 等開發內部文件依範圍決定維持原樣。
- **品牌字串**：`Project Kanban`（`<title>` / header / footer）為產品名，刻意不在地化。
- **語言鈕位置**：移入 `.header-actions`（`margin-left:auto`）並移除 `.lang-switch` 多餘的 `margin-left:8px`，間距改由 `.header-actions` 的 `gap:8px` 控制 → 靠到 header 最右、緊接 `New Project`。
- **驗證**：Playwright 實機確認——首開即英文（`html lang=en`、無 `kanban-lang`）、點繁中全站即時翻譯（含卡片徽章與 modal 動態內容）並寫入 `zh-TW`、reload 持久化、切回 EN 完整往返；`node --check` 確認內嵌 JS 語法無誤。

> ⚠️ 後續可留意：此改動使 `CLAUDE.md` 中「新增 status 要改三處」的說明略過時（狀態標籤現由 i18n + `buildStatusOptions()` 動態驅動）。本任務依文件範圍未動 `CLAUDE.md`，可另行更新該段以反映 i18n 同步點。
