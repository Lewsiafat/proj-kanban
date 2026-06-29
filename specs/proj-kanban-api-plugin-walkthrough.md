# proj-kanban-api Plugin 化與 Marketplace — Walkthrough

- **分支:** `feat/proj-kanban-api-plugin`
- **日期:** 2026-06-29

## 變更摘要

把 repo 內的 `proj-kanban-api` AI-agent skill 包成可分享的 **skill-only Claude Code plugin**,並讓本 repo
同時兼做該 plugin 的 **marketplace**。另新增本 repo 專屬、plugin-aware 的 `release` skill,讓 app 版號
(`package.json`)與 plugin 版號(`plugin.json`)永遠同步。純文件/設定/工具變更 — `src/`、`public/`、
REST API、DB schema 完全未動。隨此分支發布為 **v1.5.0**。

## 修改的檔案

**新增**

- `plugins/proj-kanban-api/.claude-plugin/plugin.json` — plugin manifest(`name`、`version`、`repository` 等)。
- `.claude-plugin/marketplace.json` — repo 根目錄的 marketplace 清單,列出本 plugin(`source: ./plugins/proj-kanban-api`)。
- `plugins/proj-kanban-api/README.md` / `README.zh-TW.md` — recipient onboarding(安裝、怎麼生一台伺服器、內容說明),雙語互連。
- `.claude/skills/release/SKILL.md` — 本 repo 專屬 release skill,bump 時同步雙版號、更新雙語 CHANGELOG、會 stage `.claude/` 與 `plugins/`、tag `vX.Y.Z`,取代全域泛用 release skill。
- `docs/plans/2026-06-29-proj-kanban-api-plugin-design.md`(+ `.zh-TW.md`)— 設計文件。
- `docs/superpowers/plans/2026-06-29-proj-kanban-api-plugin.md` — 5-task 實作計畫。

**搬移(`git mv`,保留歷史)**

- `.claude/skills/proj-kanban-api/` → `plugins/proj-kanban-api/skills/proj-kanban-api/`(SKILL.md、references/api.md、evals/evals.json)。

**修改**

- `package.json` — `version` 補 bump 1.4.0 → 1.4.1(修正 v1.4.1 release 漏 bump 的遺漏),隨後 release 再 → 1.5.0。
- `plugins/proj-kanban-api/skills/proj-kanban-api/SKILL.md` — 新增「Getting a server」段。
- `.claude/agents/api-skill-sync-reviewer.md` — 4 處 skill 路徑改指向 `plugins/...`。
- `CLAUDE.md` — skill 路徑更新、註明 repo 內開發需先 `/plugin install` 才會載入 skill、helpers 清單補 `release` 條目。
- `README.md` / `README.zh-TW.md` — skill 路徑更新 + 補 `/plugin marketplace add` 安裝片段。

## 技術細節

- **分發決策:** 範圍只含 skill(不打包伺服器);本 repo 兼 marketplace;skill 整個搬走,`.claude/skills/` 不留副本 — 因此在本 repo 內開發時 skill 不再自動載入,需先 `/plugin marketplace add .` + `/plugin install proj-kanban-api@proj-kanban`。
- **版號 invariant:** `package.json` `version` === `plugins/proj-kanban-api/.claude-plugin/plugin.json` `version` === 對應 `vX.Y.Z` tag。`marketplace.json` 不帶版號。新的 `release` skill 以同步雙版號 bump 來維持此 invariant。
- **安裝指令分流:** recipient 文件用 `/plugin marketplace add Lewsiafat/proj-kanban`;repo 內開發用 `/plugin marketplace add .`。
- **驗證方式:** 本 repo 無 build/test/lint。驗收 = `node -e` 結構驗證(marketplace → plugin → skill 解析鏈、版號 invariant)、grep 無殘留舊路徑、`api-skill-sync-reviewer` agent 比對 SKILL.md/references 與 `src/index.js` 無 drift。全數通過。
- **執行方式:** 以 subagent-driven development 逐 task 實作,每 task 經 spec + 品質雙重 review,最後做 opus 全分支 review(Ready to merge: Yes,0 Critical/Important)。
- **已知非問題:** marketplace 與 plugin.json 的 `description` 文案不同(刻意);`owner.name` 顯示名 `Lewsifat` 與 URL handle `Lewsiafat` 不同(display name vs username,與 git config 一致)。
