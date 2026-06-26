# `.claude/` Fork-Readiness — Walkthrough

- **分支:** `feat/claude-fork-readiness`
- **日期:** 2026-06-26

## 變更摘要

讓 tracked `.claude/` 適合開源 / 供他人 fork。範圍嚴格限制在 `.claude/` 內部（外加一行 `.gitignore`），取向 C（清理 + 重構）：gitignore 掉第三方 superpowers 技能、移除個人專用的 playwright 權限 wildcard、把三個 fork-facing 的繁中檔英文化（其中 hook 同時修正 i18n drift）。無任何行為改變、不動 `.claude/` 以外的程式碼或文件。

## 修改的檔案

- `.gitignore` — 新增忽略 `.claude/skills/executing-plans/`、`.claude/skills/writing-plans/`（superpowers plugin 提供的第三方技能，不屬於本 repo），消除 `git status` 雜訊。
- `.claude/settings.json` — 移除 `permissions.allow: ["mcp__playwright__*"]` 整段，只留 `hooks`。避免 fork 者一 clone 就被自動授予全部 playwright 工具權限。
- `.claude/hooks/remind-status-sync.sh` — 英文化註解與提醒文字；觸發 grep 改用現況 token（`STATUSES|statusLabel|status_|status-`）取代過時的 `<option value=`/`labels`；提醒內容對齊 CLAUDE.md 現在的三處（`STATUSES` 常數、`I18N` 兩語系的 `status_<key>`、`.status-*` CSS）。
- `.claude/skills/reset-db/SKILL.md` — 全文英文化，指令、路徑、`disable-model-invocation`、預期輸出完全不變。
- `.claude/agents/api-skill-sync-reviewer.md` — 全文英文化，`name`/`tools`/`model` frontmatter 與唯讀 drift 審查行為不變。
- `docs/plans/2026-06-26-claude-open-source-fork-readiness-design.md` — 已核准的設計文件（新增）。
- `docs/superpowers/plans/2026-06-26-claude-fork-readiness.md` — 6-task 實作計畫，含完整英文替換內容（新增）。

## 技術細節

- **流程：** brainstorming（設計核准）→ writing-plans（產出含 verbatim 英文內容的計畫）→ executing-plans（Inline 逐 task 執行 + 驗證 + commit）→ finish-task。每項改動獨立 commit，作為獨立 review gate。

- **i18n drift 修正（最關鍵的非機械性改動）：** `remind-status-sync.sh` 原本提醒「`<select>` 選項、`cardHTML()` 的 labels map」是舊架構的三處；status UI 改為 i18n-driven 後，正確三處已變成 `STATUSES` 常數、`I18N` 中 `en`/`zh-TW` 兩語系的 `status_<key>`、`.status-*` CSS。英文化時一併把提醒文字與觸發 grep 對齊 CLAUDE.md，避免再度 drift。

- **權限收窄取捨（②）：** 本機 gitignored 的 `settings.local.json` 已帶 5 個具體 playwright 權限（`browser_click`、`browser_console_messages`、`browser_evaluate`、`browser_navigate`、`browser_snapshot`）。移除 tracked `settings.json` 的 wildcard 後本機退回這組具體權限 — 涵蓋常用操作、比 wildcard 窄，對 fork-cleanliness 反而更正確。

- **驗證方式（無測試框架）：** 本 repo 無測試/build/linter，驗證改用 `bash -n`（hook 語法）、`python3 -c` JSON parse（settings 合法性 + 無 permissions key）、python3 CJK 掃描（取代 macOS BSD grep 不支援的 `-P`）、`git status`/`git check-ignore`、以及對 hook 餵 JSON payload 模擬「觸發/靜默」三種情境。

- **驗收結果：** tracked `.claude/` 經 CJK 掃描乾淨；`git status` 乾淨（兩個 superpowers 目錄不再出現）；`settings.json` 無 `permissions` 區塊且兩個 hook 完整；`reset-db`/`api-skill-sync-reviewer` 行為 marker 全數保留；diff 範圍未溢出 `.claude/`（外加 `.gitignore` 與 `docs/`）。

- **刻意排除：** 未建立 LICENSE/CONTRIBUTING 等開源治理文件（屬另一範圍）；內部規劃文件（`docs/plans/`、`docs/superpowers/plans/`）維持繁中，因不在 fork-facing 的 `.claude/` 範圍內。
