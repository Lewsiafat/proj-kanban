# `.claude/` 開源 / Fork-Readiness — 設計文件

**日期:** 2026-06-26
**分支:** `feat/claude-fork-readiness`
**狀態:** 設計已核准（brainstorming 完成），本文件為實作前的正式設計
**取向:** C — 清理 + 重構

---

## 目標

讓 `.claude/` 目錄適合開源 / 供他人 fork：移除只對「本機/本作者」有意義的雜訊，並把面向 fork 者的文字統一為英文，使任何 clone 此 repo 的人拿到的 `.claude/` 都是「專案通用、英文、可攜、無個人耦合」。

## 範圍

- **僅限 `.claude/` 內部**（外加一行 `.gitignore`）。
- **不動** `.claude/` 以外的程式碼、文件、`src/`、`public/`。
- **不碰** LICENSE / CONTRIBUTING / README（本任務不負責建立開源治理文件）。
- 內部規劃文件（本檔、`docs/plans/`）維持繁中 — 它們不屬於 `.claude/`，是作者的內部工作產物，不在 fork-facing 範圍。

## 現況盤點（探索結果）

已 fork-safe（不動）：

- 無絕對路徑或個人資訊（email / 使用者名）寫死在 tracked `.claude/`。
- `settings.json` 的 hook 路徑用 `$CLAUDE_PROJECT_DIR`，可攜。
- `settings.local.json` 與 `.mcp.json` 已 gitignored（個人 MCP / 權限），不會進 repo。
- `proj-kanban-api` 技能已全英文（可靠 CJK 掃描乾淨）。
- `hooks/check-src-syntax.sh` 已英文、可攜。

需處理的問題：

1. 兩個 superpowers plugin 技能目錄為 **untracked**，每次 `git status` 都出現雜訊，且它們是第三方 plugin 提供、不屬於本 repo。
2. `hooks/remind-status-sync.sh` 為繁中，且提醒內容**與現況 drift**：文字仍指「`<select>` 選項、`cardHTML()` 的 labels map」（舊三處），但現在 status 是 i18n-driven，三處已變成 `STATUSES` 常數、`I18N` 兩語系的 `status_<key>`、`.status-*` CSS（見 CLAUDE.md）。觸發用的 grep（`<option value=`、`labels`）也已過時。
3. `settings.json` 帶多餘的 `permissions.allow: ["mcp__playwright__*"]` wildcard — playwright 是個人測試工具，wildcard 會在 fork 後自動把**全部** playwright 工具權限授予 fork 者（他們沒選擇過的權限）。
4. `skills/reset-db/SKILL.md`（408 CJK）與 `agents/api-skill-sync-reviewer.md`（382 CJK）為繁中。

可靠 CJK 掃描（`python3` 比對，BSD grep 的 `-P` 在 macOS 不可用）確認 tracked `.claude/` 內僅這三檔含 CJK：

```
382  .claude/agents/api-skill-sync-reviewer.md
 20  .claude/hooks/remind-status-sync.sh
408  .claude/skills/reset-db/SKILL.md
```

---

## 設計：5 項改動

### ① 第三方技能 → gitignore

`.gitignore` 加入：

```
# superpowers plugin skills (third-party, provided by the plugin — not part of this repo)
.claude/skills/executing-plans/
.claude/skills/writing-plans/
```

- **理由：** 這兩個目錄由 superpowers plugin 提供，是第三方資產，不該由本 repo 版控；gitignore 後 `git status` 不再有雜訊，fork 者也不會誤以為它們是本專案的一部分。
- **效果：** 兩目錄本機保留可用，但不進 repo。

### ② `settings.json` 重構 — 移除 playwright wildcard

把 `permissions` 區塊整段移除，只留 `hooks`：

```json
{
  "hooks": {
    "PostToolUse": [ ... 維持不變 ... ]
  }
}
```

- **理由：** playwright 是個人測試工具。`mcp__playwright__*` wildcard 進入 tracked settings 會讓任何 fork 者一 clone 就自動獲得全部 playwright 工具權限 — 這是他們未曾選擇的權限授予，不該由 repo 預設。
- **本機影響：** 本機的 `settings.local.json`（gitignored）已帶 5 個具體 playwright 權限（`browser_click`、`browser_console_messages`、`browser_evaluate`、`browser_navigate`、`browser_snapshot`），移除 wildcard 後本機退回這組具體權限。涵蓋常用操作，比 wildcard 窄 — 對 fork-cleanliness 反而正確；若日後本機需要更多 playwright 工具，於 `settings.local.json` 自行加即可。

### ③ `hooks/remind-status-sync.sh` — 英文化 + 修 i18n drift

兩件事一起做：

- **英文化** 註解與提醒文字（`additionalContext`）。
- **修 drift** 使提醒對齊現況 CLAUDE.md 的三處：
  - `STATUSES` 常數（key + emoji）
  - `I18N` 字典中 `en` 與 `zh-TW` **兩語系**的 `status_<key>`
  - `.status-*` CSS 類別
- **觸發 grep** 改偵測現在相關的 token：`STATUSES`、`status_`、`statusLabel`、`.status-`（取代過時的 `<option value=`、`labels`）。

行為（PostToolUse、只在編輯 `public/index.html` 觸碰 status UI 時提醒、其餘靜默）不變。

### ④ `skills/reset-db/SKILL.md` → 英文

- frontmatter `description` 與全文英文化。
- **指令、路徑、行為完全不變**（備份 → 刪 DB → 重啟重建 → 驗證）。
- 保留既有英文 trigger 詞，另把繁中 trigger 詞（「reset db」「重建資料庫」等）整理為英文等義詞，使 description 全英文但仍能被觸發。
- `disable-model-invocation: true` 維持。

### ⑤ `agents/api-skill-sync-reviewer.md` → 英文

- frontmatter `description` 與全文英文化。
- 行為不變（唯讀 drift 審查，`tools: Read, Grep, Glob`、`model: sonnet` 維持）。

### 不動清單

- `proj-kanban-api` 技能（已全英文）
- `hooks/check-src-syntax.sh`（已英文、可攜）
- `settings.local.json`、`.mcp.json`（維持 gitignored，個人設定）

---

## 驗收標準

1. `git ls-files .claude` 列出的每個檔都是「專案通用、英文、可攜」。
2. tracked `.claude/` 經可靠 CJK 掃描（python3）後**無 CJK**。
3. `.claude/skills/executing-plans/`、`.claude/skills/writing-plans/` 不再出現在 `git status`。
4. `settings.json` 不再含 `permissions` 區塊；`node`/hook 行為不受影響（hook 仍正常觸發）。
5. `remind-status-sync.sh` 的提醒文字與 CLAUDE.md 描述的三處一致；觸發 grep 用新 token。
6. `reset-db`、`api-skill-sync-reviewer` 的行為（指令/路徑/工具/model）與英文化前等價。

## 預期檔案變更

```
修改：.gitignore                                  — 加入兩個 superpowers 技能目錄
修改：.claude/settings.json                       — 移除 permissions(mcp__playwright__*)
修改：.claude/hooks/remind-status-sync.sh         — 英文化 + 修 i18n 三處 + 更新觸發 grep
修改：.claude/skills/reset-db/SKILL.md            — 英文化（行為不變）
修改：.claude/agents/api-skill-sync-reviewer.md   — 英文化（行為不變）
新增：docs/plans/2026-06-26-claude-open-source-fork-readiness-design.md（本檔）
```

## 風險與權衡

- **②的權限收窄**：移除 wildcard 後本機 playwright 權限變窄（見 ②本機影響）。已與使用者於 brainstorming 確認此為可接受、且對 fork 更正確的取捨。
- **③同時改兩件事**（英文化 + drift 修正）：兩者都動到同一段文字，合併處理可避免改兩次；提醒內容須以 CLAUDE.md 為準逐字對齊，避免再次 drift。
- **本任務不建立開源治理文件**（LICENSE/CONTRIBUTING）：刻意排除，屬另一範圍。
