# 設計:把 `proj-kanban-api` skill 包成可分享的 Claude Code plugin

**日期:** 2026-06-29
**狀態:** 已核准
**語言:** [English](./2026-06-29-proj-kanban-api-plugin-design.md)(主檔) · 繁體中文

> 本檔為英文主檔的中文對照。內容若有出入,以英文主檔為準。

## 概述

把 repo 內的 `proj-kanban-api` skill 抽成獨立、可安裝的 **skill-only Claude Code plugin**,並讓
**本 repo 同時兼做 plugin marketplace**。安裝者得到的是「用 7 個 REST 端點操作 proj-kanban 看板」
的能力;看板伺服器本身**不打包**——安裝者自行 `npm start`,或指向既有伺服器。

## 目標

- 把 `proj-kanban-api` 做成可透過 `/plugin marketplace add` 分發的 plugin。
- 分發留在本 repo(一個 git URL 同時給 skill plugin 與——對想要的人——已在 repo 內的可跑伺服器原始碼)。
- 新增**本 repo 專屬的 `release` skill**,讓發布時 plugin 版本與 app 版本同步。

## 非目標(YAGNI)

- **不**把 Express/SQLite/前端服務打包進 plugin。
- **不**把開發工具(`hooks`、`api-skill-sync-reviewer` agent、`reset-db` skill、`.mcp.json`)打包進 plugin。
- **不**做動態 server-URL 設定機制——改以文件說明。
- **不**給 plugin 獨立版號或獨立 CHANGELOG。

## 決策(來自 brainstorming)

| 決策 | 結論 |
|---|---|
| plugin 範圍 | **只含 skill** — 僅 `proj-kanban-api`;不打包伺服器。 |
| 分發 | **本 repo 兼做 marketplace**(`.claude-plugin/marketplace.json`)。 |
| skill 去重 | **整個搬到** `plugins/`;`.claude/skills/` 不留副本。 |
| 文件語言 | **英文為主**,`*.zh-TW.md` 中文檔連過去(比照 repo 的 README/CHANGELOG 模式)。 |
| plugin 版本 | **與 app 版本綁定**(起始 `1.4.1`,= `package.json`);一起發。 |
| 發布工具 | **新增本 repo 專屬 `release` skill**(plugin-aware),在本 repo 取代泛用的全域版。 |

## 已查證的 plugin/marketplace schema

- `marketplace.json` 放 repo 根的 `.claude-plugin/marketplace.json`。必填:`name`、`owner.name`、
  `plugins[]`。每個 plugin entry 需 `name` + `source`,`source` 是**相對 repo 根**的路徑
  (例如 `./plugins/proj-kanban-api`)。
- `plugin.json` 放 `<plugin>/.claude-plugin/plugin.json`。只有 `name`(kebab-case)必填;
  `version` 可省略(省略時退回 git SHA)。
- Skill 由 `<plugin>/skills/<name>/SKILL.md` 自動發現——不必在 `plugin.json` 列出。
- 安裝時 plugin 目錄會被複製到 `~/.claude/plugins/cache/`,所以 plugin **不能引用自身目錄外的檔案**
  (例如 repo 的 `src/`)。本案無關——plugin 只含 skill、自包含。

## 目標檔案結構

```
proj-kanban/                              (現有 repo;同時是 marketplace)
├── .claude-plugin/
│   └── marketplace.json                  ← 新增(marketplace 清單)
├── plugins/
│   └── proj-kanban-api/
│       ├── .claude-plugin/
│       │   └── plugin.json               ← 新增(version 1.4.1)
│       ├── README.md                     ← 新增(英文主檔)
│       ├── README.zh-TW.md               ← 新增(從 README.md 連過去)
│       └── skills/
│           └── proj-kanban-api/          ← 由 .claude/skills/ git mv 過來
│               ├── SKILL.md              (+ 「怎麼生一台伺服器」一段)
│               ├── references/api.md
│               └── evals/evals.json
├── .claude/
│   ├── skills/
│   │   └── release/SKILL.md              ← 新增(本 repo 專屬 release skill)
│   └── agents/
│       └── api-skill-sync-reviewer.md    ← 更新(4 處路徑引用)
├── CLAUDE.md                             ← 更新(skill 路徑、開發提示、新 release skill)
├── README.md / README.zh-TW.md           ← 更新(skill 路徑、marketplace 安裝)
└── src/ public/ ...                      (伺服器原始碼,不動)
```

附註:
- 目錄用 `plugins/`(複數)——對齊官方慣例,日後加第二個 plugin 不必重整。
- skill 資料夾名沿用 `proj-kanban-api`;namespace 叫用為 `/proj-kanban-api:proj-kanban-api`
  (主要靠 description 自動觸發,全名次要)。
- `evals/` 隨 skill 整包搬移(屬 skill 的一部分;對安裝者無害)。

## Manifest 內容

**`.claude-plugin/marketplace.json`**(repo 根):
```json
{
  "name": "proj-kanban",
  "owner": { "name": "Lewsifat", "email": "lewsiafat@gmail.com" },
  "description": "proj-kanban skills & tools",
  "plugins": [
    {
      "name": "proj-kanban-api",
      "source": "./plugins/proj-kanban-api",
      "description": "Drive a proj-kanban board over its REST API (7 endpoints)."
    }
  ]
}
```

**`plugins/proj-kanban-api/.claude-plugin/plugin.json`**:
```json
{
  "name": "proj-kanban-api",
  "version": "1.4.1",
  "description": "Read and mutate a proj-kanban kanban board over its REST API.",
  "author": { "name": "Lewsifat", "email": "lewsiafat@gmail.com" },
  "repository": "https://github.com/Lewsiafat/proj-kanban",
  "license": "MIT",
  "keywords": ["kanban", "rest-api", "proj-kanban"]
}
```

`marketplace.json` 的 plugin entry 刻意不放 `version`(少一個同步點;plugin 版本以 `plugin.json` 為準)。

## Skill 搬移 + 連帶更新

1. `git mv .claude/skills/proj-kanban-api → plugins/proj-kanban-api/skills/proj-kanban-api`(保留歷史)。
2. 更新三個引用舊路徑的檔案:
   - `.claude/agents/api-skill-sync-reviewer.md` — 4 處(description、開頭句、兩個「Files to compare」)。
   - `CLAUDE.md` — skill 路徑與「skill 隨哪裡出貨」那句。
   - `README.md` / `README.zh-TW.md` — skill 路徑,並補一段「本 repo 是 marketplace、這樣安裝」。
3. **Server-URL 缺口(僅文件):** 在 `SKILL.md` 與 plugin README 各加一小段「怎麼生一台伺服器」:
   若手上沒有伺服器,`git clone … && npm install && npm start`(預設
   `http://localhost:10023/proj-kanban/api`);host/port/`BASE_PATH` 不同請自行替換。SKILL.md 既有
   `/${BASE_PATH}/api` 說明已涵蓋變動,只需補「從哪生一台」這句。

## 新增本 repo 專屬 `release` skill

`.claude/skills/release/SKILL.md` — **不**打包進 plugin;屬 repo 維護工具。以泛用的全域 `release`
skill 為藍本,做三項 repo 客製:

| 客製 | 內容 |
|---|---|
| 同步 plugin 版本 | bump 時把同一版號同時寫進 `package.json` 與 `plugins/proj-kanban-api/.claude-plugin/plugin.json`。 |
| 會 stage `.claude/` | 移除全域版「never stage `.claude/`」規則——本 repo 的 `.claude/`、`plugins/` **必須**進 commit。 |
| 承襲 repo 慣例 | 同時更新 `CHANGELOG.md` 與 `CHANGELOG.zh-TW.md`;commit `chore(release): vX.Y.Z`;annotated tag `vX.Y.Z`;push。 |

其餘照既有發布流程:問版號 → 更新 docs → commit → 若在 feature 分支則 merge 回 main → tag → push → 回報。

## 安裝者體驗

```bash
/plugin marketplace add Lewsiafat/proj-kanban      # 或本地路徑 / 完整 git URL
/plugin install proj-kanban-api@proj-kanban
```

裝完 skill 自動載入,提到 kanban/board/column 等就觸發。plugin README(一句定位 → 兩行安裝指令 →
「怎麼生一台伺服器」→ 指回 repo 看完整 API 合約)是安裝者的入口。

## 維護面影響(誠實揭露)

- **在本 repo 內開發時不再自動載入這個 skill**(「整個搬走」的後果)。要在本地開發時用它:
  `/plugin marketplace add .` + install,或手動載入。已記於 `CLAUDE.md`。
- **`release` 現在是 project-local。** repo 自己的 `release` skill 會蓋過全域版,成為日後正規發布路徑。
- **`api-skill-sync-reviewer`** 在路徑更新後照常運作(仍比對 `src/index.js` ↔ 新位置的 skill 文件)。

## 工作拆解(供實作計畫)

1. 建 `plugins/proj-kanban-api/.claude-plugin/plugin.json`。
2. 建 `.claude-plugin/marketplace.json`。
3. `git mv` skill 到 `plugins/proj-kanban-api/skills/proj-kanban-api/`。
4. 在搬移後的 `SKILL.md` 加「怎麼生一台伺服器」一段。
5. 建 `plugins/proj-kanban-api/README.md` + `README.zh-TW.md`。
6. 更新 `api-skill-sync-reviewer.md`、`CLAUDE.md`、`README.md`、`README.zh-TW.md` 的路徑引用。
7. 建 `.claude/skills/release/SKILL.md`(project-local、plugin-aware)。
8. 驗證:`/plugin marketplace add .` + install 能解析且 skill 載入;搬移後重跑
   `api-skill-sync-reviewer` 確認無 drift。
