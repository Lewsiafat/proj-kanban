# proj-kanban-api Skill — Walkthrough

- **分支:** `feat/proj-kanban-api-skill`
- **日期:** 2026-06-22

## 變更摘要

新增一個給 AI Agent 使用的 Claude skill `proj-kanban-api`,涵蓋本專案 REST API 的全部 7 個端點,
讓外部 agent 能透過 curl/HTTP 正確操作看板(讀取、建立/更新/刪除欄位與卡片),而不需自行猜測
API 形狀。skill 隨 repo 一起版控於 `.claude/skills/`,clone 專案即可取得。

## 修改的檔案

- `.claude/skills/proj-kanban-api/SKILL.md` — 操作指南:base URL/設定、「任務 → 端點」決策表、
  常見工作流程、footgun/安全清單、mutation 前置檢查表。description 寫得「主動」以利觸發。
- `.claude/skills/proj-kanban-api/references/api.md` — 7 個端點的完整契約:method/path/body、
  所有狀態碼、回應結構、預設值、POST `||` vs PUT `??` 語意,以及可複製的 curl 範例。
- `.claude/skills/proj-kanban-api/evals/evals.json` — 11 個評測題(5 個快樂路徑 + 6 個 footgun
  edge case),作為 skill 的正確性回歸基準。
- `specs/proj-kanban-api-skill-walkthrough.md` — 本文件。

> 註:benchmark 工作區(viewer / benchmark.json / 乾淨 baseline 輸出)為開發評測 scaffolding,
> 保留在 repo 之外的 `~/.claude/skills/proj-kanban-api-workspace/`,未納入版控。

## 技術細節

### 製作方式(workflow 驅動的 skill-creator)

1. **設計** — 3 視角 drafter panel(task-workflow / reference / gotchas)+ synthesizer 合成。
   synthesizer 逐條對照 `src/index.js` 驗證,修正草稿的偏差(POST 用 `||`、PUT 用 `??` 的差異;
   title 驗證早於 project 查找;建立回 **200 非 201**;更正草稿對 SPA fallback 的錯誤宣稱)。
2. **測試 + benchmark** — 以 plan-based 評測,with_skill vs baseline 各自產出精確 API 呼叫序列,
   再由獨立 grader 對照 assertions 計分。

### Benchmark 重點(去汙染後)

第一輪 in-repo benchmark 顯示差距僅約 2pp,後來發現是**測量假象**:當時的「no-skill」baseline
subagent 同時看得到 (a) 全域安裝的 skill 本身、(b) 本 repo 的 `CLAUDE.md`,早已知道 API。

去汙染後(baseline = 從 `/tmp` 跑 `claude -p`、暫時移走全域 skill、無 CLAUDE.md,即 skill 真實
分發環境),在 6 個有鑑別度的 edge eval 上:

| | with_skill | 乾淨 baseline |
|---|---:|---:|
| macro pass-rate | **100%** | 17% |
| micro(逐條 assertion) | **16/16** | 3/16 |
| **delta** | | **+83pp** |

乾淨 baseline 踩中了 skill 警告的每一個 footgun:找不到 `/proj-kanban/api` base path、發明
`GET /cards/:id`、發明 `PATCH`+`position` reorder、誤答 201(實際 200)。證明 skill 對其真實對象
(無 repo、無 CLAUDE.md 的外部 agent)把 API 正確使用率從 17% 提升到 100%。

### 維護

API 的 source of truth 是 `src/index.js`;若端點變動,需同步更新此 skill 的 SKILL.md 與 api.md。
