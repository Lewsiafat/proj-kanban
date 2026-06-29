# proj-kanban-api Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package the repo's `proj-kanban-api` skill as a shareable, skill-only Claude Code plugin, with this repo doubling as the plugin marketplace, plus a project-local `release` skill that keeps the plugin version in lockstep with the app version.

**Architecture:** Move the skill out of `.claude/skills/` into a new `plugins/proj-kanban-api/` plugin directory; add a repo-root `.claude-plugin/marketplace.json` that lists it; repoint every doc/agent reference to the new path; add recipient-facing onboarding docs (plugin README, "getting a server" note); add a tailored `release` skill. No application code (`src/`, `public/`) changes.

**Tech Stack:** Claude Code plugin/marketplace JSON manifests, Markdown docs, git. No build/test/lint toolchain in this repo — verification is JSON validity, structural checks via `node -e`, grep, and the `api-skill-sync-reviewer` agent.

## Global Constraints

- **No build step, no test suite, no linter** in this repo. "Tests" here = JSON-parse checks, `node -e` structural assertions, grep, and dispatching the `api-skill-sync-reviewer` agent.
- **Docs are English-primary**, with `*.zh-TW.md` companions linked from the top of the English file (mirror the existing `README.md` / `README.zh-TW.md`, `CHANGELOG.md` / `CHANGELOG.zh-TW.md` pattern). Any new user-facing doc gets both.
- **Plugin version == app version.** `plugins/proj-kanban-api/.claude-plugin/plugin.json` `version` must equal `package.json` `version` (currently `1.4.1`). `marketplace.json` carries no version.
- **`.claude/` and `plugins/` are tracked and committed** in this repo (unlike a typical project). Stage them in commits.
- **Names are kebab-case** (plugin name, marketplace name, skill folder).
- **Do not touch** `src/index.js`, `public/index.html`, the DB schema, or the REST API. This is docs/config tooling only.
- **Repo URL:** `https://github.com/Lewsiafat/proj-kanban`. **Marketplace name:** `proj-kanban`. **Plugin name:** `proj-kanban-api`.
- Commit trailer for every commit: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Work happens on branch `feat/proj-kanban-api-plugin` (already created; the design doc is already committed there).

---

## File Structure

**Create:**
- `.claude-plugin/marketplace.json` — repo-as-marketplace listing.
- `plugins/proj-kanban-api/.claude-plugin/plugin.json` — plugin manifest.
- `plugins/proj-kanban-api/README.md` + `README.zh-TW.md` — recipient onboarding.
- `.claude/skills/release/SKILL.md` — project-local, plugin-aware release skill.

**Move (git mv):**
- `.claude/skills/proj-kanban-api/` → `plugins/proj-kanban-api/skills/proj-kanban-api/` (SKILL.md, references/api.md, evals/evals.json).

**Modify:**
- `plugins/proj-kanban-api/skills/proj-kanban-api/SKILL.md` — add a "Getting a server" section (after the move).
- `.claude/agents/api-skill-sync-reviewer.md` — repoint 4 path references.
- `CLAUDE.md` — repoint skill path, add the in-repo install note, add the `release` skill to the helpers list.
- `README.md` / `README.zh-TW.md` — repoint skill path + add marketplace install snippet.

---

## Task 1: Establish the plugin (move skill + manifest)

**Files:**
- Create: `plugins/proj-kanban-api/.claude-plugin/plugin.json`
- Move: `.claude/skills/proj-kanban-api/` → `plugins/proj-kanban-api/skills/proj-kanban-api/`

**Interfaces:**
- Produces: the plugin directory `plugins/proj-kanban-api/` containing `.claude-plugin/plugin.json` and `skills/proj-kanban-api/SKILL.md`. Later tasks (marketplace, docs, release skill) depend on this path.

- [ ] **Step 1: Move the skill, preserving git history**

```bash
mkdir -p plugins/proj-kanban-api/skills
git mv .claude/skills/proj-kanban-api plugins/proj-kanban-api/skills/proj-kanban-api
```

- [ ] **Step 2: Verify the move landed and the old path is gone**

```bash
ls plugins/proj-kanban-api/skills/proj-kanban-api/   # SKILL.md  references  evals
test ! -e .claude/skills/proj-kanban-api && echo "old path removed"
```
Expected: the three entries listed, then `old path removed`.

- [ ] **Step 3: Create the plugin manifest**

Create `plugins/proj-kanban-api/.claude-plugin/plugin.json`:
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

- [ ] **Step 4: Verify the manifest is valid JSON and version matches the app**

```bash
node -e 'const p=require("./plugins/proj-kanban-api/.claude-plugin/plugin.json"),a=require("./package.json"); if(p.version!==a.version) throw new Error("version mismatch "+p.version+" != "+a.version); console.log("plugin.json valid, version",p.version)'
```
Expected: `plugin.json valid, version 1.4.1`.

- [ ] **Step 5: Commit**

```bash
git add -A plugins/proj-kanban-api .claude/skills
git commit -m "$(cat <<'EOF'
feat(plugin): 將 proj-kanban-api skill 移入 plugins/ 並新增 plugin.json

skill 由 .claude/skills/ 整個搬到 plugins/proj-kanban-api/skills/,
新增 plugin manifest(version 1.4.1,與 app 同版號)。

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Repo-as-marketplace manifest

**Files:**
- Create: `.claude-plugin/marketplace.json`

**Interfaces:**
- Consumes: `plugins/proj-kanban-api/` from Task 1 (referenced by `source`).
- Produces: a resolvable marketplace at the repo root; install command `proj-kanban-api@proj-kanban`.

- [ ] **Step 1: Create the marketplace manifest**

Create `.claude-plugin/marketplace.json`:
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

- [ ] **Step 2: Verify the marketplace resolves structurally**

Run this validator (checks JSON validity, that each plugin `source` exists, has a valid `plugin.json`, and a `skills/` dir):
```bash
node -e '
const fs=require("fs");
const mk=JSON.parse(fs.readFileSync(".claude-plugin/marketplace.json","utf8"));
if(!mk.name||!mk.owner||!mk.owner.name||!Array.isArray(mk.plugins)) throw new Error("marketplace missing required fields");
for(const p of mk.plugins){
  const dir=p.source.replace(/^\.\//,"");
  const man=dir+"/.claude-plugin/plugin.json";
  if(!fs.existsSync(man)) throw new Error("missing manifest: "+man);
  JSON.parse(fs.readFileSync(man,"utf8"));
  if(!fs.existsSync(dir+"/skills")) throw new Error("missing skills dir under "+dir);
  console.log("OK:",p.name,"->",man);
}
console.log("marketplace valid");
'
```
Expected: `OK: proj-kanban-api -> ...` then `marketplace valid`.

- [ ] **Step 3: Commit**

```bash
git add .claude-plugin/marketplace.json
git commit -m "$(cat <<'EOF'
feat(plugin): 新增 .claude-plugin/marketplace.json,本 repo 兼做 marketplace

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Repoint stale skill-path references

**Files:**
- Modify: `.claude/agents/api-skill-sync-reviewer.md`
- Modify: `CLAUDE.md:23`
- Modify: `README.md:68`
- Modify: `README.zh-TW.md:68`

**Interfaces:**
- Consumes: the new skill path `plugins/proj-kanban-api/skills/proj-kanban-api/` from Task 1, and the install command from Task 2.

- [ ] **Step 1: Repoint all 4 references in the sync-reviewer agent**

Every occurrence of the substring `.claude/skills/proj-kanban-api` becomes `plugins/proj-kanban-api/skills/proj-kanban-api` in `.claude/agents/api-skill-sync-reviewer.md` (4 spots: the `description:` frontmatter, the intro sentence "the docs in `...`", and the two "Files to compare" bullets):
```bash
sed -i '' 's#\.claude/skills/proj-kanban-api#plugins/proj-kanban-api/skills/proj-kanban-api#g' .claude/agents/api-skill-sync-reviewer.md
```

- [ ] **Step 2: Repoint + expand the CLAUDE.md skill line**

In `CLAUDE.md`, replace the line (currently line 23):
```
An AI-agent skill for this REST API ships in `.claude/skills/proj-kanban-api/` (`SKILL.md` operating guide + full per-endpoint contract in `references/api.md`); keep it in sync with `src/index.js` when endpoints change.
```
with:
```
An AI-agent skill for this REST API ships as a **Claude Code plugin** in `plugins/proj-kanban-api/` (skill at `skills/proj-kanban-api/` — `SKILL.md` operating guide + full per-endpoint contract in `references/api.md`); keep it in sync with `src/index.js` when endpoints change. This repo doubles as the plugin's marketplace (`.claude-plugin/marketplace.json`). **The skill no longer lives under `.claude/skills/`, so it is not auto-loaded while you work in this repo — install it first: `/plugin marketplace add .` then `/plugin install proj-kanban-api@proj-kanban`.**
```

- [ ] **Step 3: Repoint + add install snippet in README.md**

In `README.md`, replace the line (currently line 68):
```
A bundled Claude skill (`.claude/skills/proj-kanban-api/`) teaches AI agents to drive the board over this REST API — endpoint selection, correct request bodies, and the footguns — so agents don't have to guess the API shape. Agents that have the repo discover it automatically; it can also be copied into another project's `.claude/skills/` or `~/.claude/skills/`.
```
with:
```
A Claude skill (`plugins/proj-kanban-api/skills/proj-kanban-api/`) teaches AI agents to drive the board over this REST API — endpoint selection, correct request bodies, and the footguns — so agents don't have to guess the API shape. It ships as a **Claude Code plugin**, and this repo doubles as its marketplace:

```bash
/plugin marketplace add Lewsiafat/proj-kanban
/plugin install proj-kanban-api@proj-kanban
```

See `plugins/proj-kanban-api/README.md` for details.
```

- [ ] **Step 4: Repoint + add install snippet in README.zh-TW.md**

In `README.zh-TW.md`, replace the line (currently line 68):
```
內建的 Claude skill（`.claude/skills/proj-kanban-api/`）會教 AI agent 透過此 REST API 操作看板 — 包含端點選擇、正確的 request body 以及各種陷阱 — 讓 agent 不必猜測 API 形狀。擁有此 repo 的 agent 會自動發現它；也可複製到其他專案的 `.claude/skills/` 或 `~/.claude/skills/` 使用。
```
with:
```
一個 Claude skill（`plugins/proj-kanban-api/skills/proj-kanban-api/`）會教 AI agent 透過此 REST API 操作看板 — 包含端點選擇、正確的 request body 以及各種陷阱 — 讓 agent 不必猜測 API 形狀。它以 **Claude Code plugin** 形式發布,本 repo 同時兼做其 marketplace:

```bash
/plugin marketplace add Lewsiafat/proj-kanban
/plugin install proj-kanban-api@proj-kanban
```

詳見 `plugins/proj-kanban-api/README.zh-TW.md`。
```

- [ ] **Step 5: Verify no stale skill-path references remain in the edited files**

```bash
grep -rn "\.claude/skills/proj-kanban-api" CLAUDE.md README.md README.zh-TW.md .claude/agents/api-skill-sync-reviewer.md && echo "STALE REFS FOUND" || echo "clean"
```
Expected: `clean` (grep finds nothing). (CHANGELOG history is intentionally left untouched.)

- [ ] **Step 6: Verify the sync reviewer still works at the new path and reports no drift**

Dispatch the `api-skill-sync-reviewer` agent (it now reads the moved docs). Confirm it returns `✅ API and docs are in sync, no drift found.` If it reports drift, the move/edits broke a path — fix before committing.

- [ ] **Step 7: Commit**

```bash
git add .claude/agents/api-skill-sync-reviewer.md CLAUDE.md README.md README.zh-TW.md
git commit -m "$(cat <<'EOF'
docs(plugin): 將 skill 路徑引用指向 plugins/ 並補 marketplace 安裝說明

更新 api-skill-sync-reviewer agent、CLAUDE.md、README(EN/zh-TW)的
skill 路徑;README 補上 /plugin 安裝指令;CLAUDE.md 註明在 repo 內
開發需先安裝 plugin 才會載入 skill。

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Recipient onboarding docs

**Files:**
- Modify: `plugins/proj-kanban-api/skills/proj-kanban-api/SKILL.md`
- Create: `plugins/proj-kanban-api/README.md`
- Create: `plugins/proj-kanban-api/README.zh-TW.md`

**Interfaces:**
- Consumes: the install command (Task 2) and the skill location (Task 1).

- [ ] **Step 1: Add a "Getting a server" section to the moved SKILL.md**

In `plugins/proj-kanban-api/skills/proj-kanban-api/SKILL.md`, immediately after the `## Base URL & config` section (it ends with the fenced `API="http://localhost:10023/proj-kanban/api"` block) and before `## Task → endpoint decision guide`, insert:
```markdown
## Getting a server

These calls need a running proj-kanban server. If none is up, start one:

​```bash
git clone https://github.com/Lewsiafat/proj-kanban.git
cd proj-kanban && npm install && npm start
​```

It serves at the default `http://localhost:10023/proj-kanban/api`. For a different host, `PORT`, or `BASE_PATH`, substitute it — the API always lives at `/${BASE_PATH}/api`.
```
(When inserting, use real triple-backtick fences — the `​` zero-width marks above are only to show nesting in this plan.)

- [ ] **Step 2: Create the plugin README (English)**

Create `plugins/proj-kanban-api/README.md`:
```markdown
# proj-kanban-api (Claude Code plugin)

**English** · [繁體中文](./README.zh-TW.md)

A skill-only Claude Code plugin that teaches an AI agent to drive a
[proj-kanban](https://github.com/Lewsiafat/proj-kanban) board over its REST API — the 7
endpoints, correct request bodies, id resolution, and the footguns — so the agent doesn't guess
the API shape.

This plugin ships the **skill only**; it does not include the kanban server. You point the agent
at a running proj-kanban server.

## Install

​```bash
/plugin marketplace add Lewsiafat/proj-kanban
/plugin install proj-kanban-api@proj-kanban
​```

The skill auto-loads and triggers when you mention the kanban board, its columns/cards, or its API.

## Getting a server

The skill talks to a running proj-kanban server (default
`http://localhost:10023/proj-kanban/api`). If you don't have one:

​```bash
git clone https://github.com/Lewsiafat/proj-kanban.git
cd proj-kanban && npm install && npm start
​```

If your server uses a different host, `PORT`, or `BASE_PATH`, substitute it — the API always lives
at `/${BASE_PATH}/api`.

## What's inside

- `skills/proj-kanban-api/SKILL.md` — operating guide (task → endpoint, workflows, footguns)
- `skills/proj-kanban-api/references/api.md` — the full per-endpoint contract

For the server itself and the full project, see the
[proj-kanban repo](https://github.com/Lewsiafat/proj-kanban).
```
(Use real triple-backtick fences in place of the `​`-marked ones.)

- [ ] **Step 3: Create the plugin README (Traditional Chinese)**

Create `plugins/proj-kanban-api/README.zh-TW.md`:
```markdown
# proj-kanban-api(Claude Code plugin)

[English](./README.md) · **繁體中文**

一個 skill-only 的 Claude Code plugin,教 AI agent 透過 REST API 操作
[proj-kanban](https://github.com/Lewsiafat/proj-kanban) 看板 — 涵蓋 7 個端點、正確的
request body、id 解析,以及各種陷阱 — 讓 agent 不必猜測 API 形狀。

這個 plugin **只含 skill**,不包含看板伺服器。你要讓 agent 指向一個正在執行的 proj-kanban 伺服器。

## 安裝

​```bash
/plugin marketplace add Lewsiafat/proj-kanban
/plugin install proj-kanban-api@proj-kanban
​```

skill 會自動載入,當你提到看板、欄/卡片或其 API 時觸發。

## 怎麼生一台伺服器

skill 需要一個正在執行的 proj-kanban 伺服器(預設
`http://localhost:10023/proj-kanban/api`)。若手上沒有:

​```bash
git clone https://github.com/Lewsiafat/proj-kanban.git
cd proj-kanban && npm install && npm start
​```

若你的伺服器用不同的 host、`PORT` 或 `BASE_PATH`,請自行替換 — API 永遠位於 `/${BASE_PATH}/api`。

## 內容

- `skills/proj-kanban-api/SKILL.md` — 操作指南(task → 端點、workflow、陷阱)
- `skills/proj-kanban-api/references/api.md` — 完整逐端點合約

伺服器本身與完整專案請見
[proj-kanban repo](https://github.com/Lewsiafat/proj-kanban)。
```
(Use real triple-backtick fences in place of the `​`-marked ones.)

- [ ] **Step 4: Verify the docs are well-formed and cross-linked**

```bash
test -f plugins/proj-kanban-api/README.md && test -f plugins/proj-kanban-api/README.zh-TW.md && echo "both READMEs exist"
grep -q "README.zh-TW.md" plugins/proj-kanban-api/README.md && grep -q "README.md" plugins/proj-kanban-api/README.zh-TW.md && echo "cross-links present"
grep -q "## Getting a server" plugins/proj-kanban-api/skills/proj-kanban-api/SKILL.md && echo "SKILL.md note added"
```
Expected: `both READMEs exist`, `cross-links present`, `SKILL.md note added`.

- [ ] **Step 5: Commit**

```bash
git add plugins/proj-kanban-api/README.md plugins/proj-kanban-api/README.zh-TW.md plugins/proj-kanban-api/skills/proj-kanban-api/SKILL.md
git commit -m "$(cat <<'EOF'
docs(plugin): 新增 plugin README(EN/zh-TW)與 SKILL.md「怎麼生一台伺服器」說明

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Project-local `release` skill

**Files:**
- Create: `.claude/skills/release/SKILL.md`
- Modify: `CLAUDE.md` (helpers list)

**Interfaces:**
- Consumes: `package.json` and `plugins/proj-kanban-api/.claude-plugin/plugin.json` (the two version sources it must keep in sync).

- [ ] **Step 1: Create the release skill**

Create `.claude/skills/release/SKILL.md`:
```markdown
---
name: release
description: >
  Release a new version of proj-kanban (this repo). Use when the user says "release",
  "發布", "發布新版本", "版本發布", "bump version", "tag and push". Bumps BOTH package.json
  and the plugin's plugin.json to the same version, updates the bilingual CHANGELOG, commits,
  tags, and pushes. Project-local — supersedes the generic global release skill here.
---

# Release Workflow (proj-kanban)

This repo ships an app **and** a Claude Code plugin from one version line. A release bumps both in
lockstep. This skill is tailored to this repo and overrides the generic global `release` skill.

## Procedure

1. **Check current state**
   - `git status` and `git diff --stat HEAD`
   - `git tag --sort=-v:refname | head -1` for the latest version

2. **Ask the user** (AskUserQuestion):
   - New version number (suggest major/minor/patch from the change type)
   - Any untracked files to include
   - Unclear changelog details

3. **Bump the version in BOTH files to the same value:**
   - `package.json` → `"version"`
   - `plugins/proj-kanban-api/.claude-plugin/plugin.json` → `"version"`
   These two MUST match. (`marketplace.json` carries no version — leave it.)

4. **Update the bilingual changelog** (both files, Keep a Changelog format, newest section on top):
   - `CHANGELOG.md`
   - `CHANGELOG.zh-TW.md`

   ​```
   ## [X.Y.Z] - YYYY-MM-DD

   ### Added / Changed / Fixed / Removed
   - …
   ​```

5. **Update docs if the release changed them:** `CLAUDE.md`, `README.md`, `README.zh-TW.md`.

6. **Commit.** Unlike the generic release skill, **DO stage `.claude/` and `plugins/`** — in this
   repo they are tracked and part of the product. Message (HEREDOC):

   ​```
   chore(release): vX.Y.Z

   Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
   ​```

7. **Merge back to main if on a feature branch:**
   ​```bash
   git checkout main
   git merge <feature-branch> --no-ff -m "Merge '<feature-branch>' into main"
   ​```
   Stop and ask if there are conflicts.

8. **Tag** (annotated, on main):
   ​```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z: <summary>"
   ​```

9. **Push:**
   ​```bash
   git push && git push --tags
   ​```

10. **Report:** commit hash, tag, version (confirm `package.json` == `plugin.json`), changed files.

## Version guidelines

- **Major** (X.0.0): breaking REST API change (endpoint/contract removed or changed incompatibly).
- **Minor** (x.Y.0): new endpoint, new feature, new skill/plugin capability.
- **Patch** (x.y.Z): bug fix, doc-only, internal tweak.

## Invariant

After every release: `package.json` `version` === `plugins/proj-kanban-api/.claude-plugin/plugin.json`
`version` === the `vX.Y.Z` tag. If they ever diverge, the release is wrong.
```
(Use real triple-backtick fences in place of the `​`-marked ones.)

- [ ] **Step 2: Verify the skill frontmatter parses and the version-sync claim is checkable**

```bash
head -8 .claude/skills/release/SKILL.md | grep -q "^name: release" && echo "frontmatter ok"
node -e 'const p=require("./plugins/proj-kanban-api/.claude-plugin/plugin.json"),a=require("./package.json"); console.log(p.version===a.version?"versions in sync: "+a.version:"MISMATCH")'
```
Expected: `frontmatter ok`, then `versions in sync: 1.4.1`.

- [ ] **Step 3: Add the `release` skill to the CLAUDE.md helpers list**

In `CLAUDE.md`, after the `reset-db` bullet (currently line 29):
```
- **`reset-db`** (`.claude/skills/`, user-invoked): backs up and recreates the SQLite DB for the migration-less schema changes noted above.
```
add a new bullet:
```
- **`release`** (`.claude/skills/`, user-invoked): project-local release skill — bumps `package.json` and the plugin's `plugin.json` to the same version, updates the bilingual `CHANGELOG`, commits (staging `.claude/` and `plugins/`), tags `vX.Y.Z`, and pushes. Supersedes the generic global `release` skill for this repo.
```

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/release/SKILL.md CLAUDE.md
git commit -m "$(cat <<'EOF'
feat(skill): 新增本 repo 專屬 plugin-aware release skill

bump 時同步 package.json 與 plugin.json 版號、更新 bilingual CHANGELOG、
會 stage .claude/ 與 plugins/、tag vX.Y.Z;取代全域泛用 release skill。
CLAUDE.md helpers 清單補上此 skill。

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Final acceptance (run after Task 5)

End-to-end checks across the whole change:

- [ ] **Marketplace + plugin resolve structurally:**
```bash
node -e '
const fs=require("fs");
const mk=JSON.parse(fs.readFileSync(".claude-plugin/marketplace.json","utf8"));
for(const p of mk.plugins){
  const dir=p.source.replace(/^\.\//,"");
  JSON.parse(fs.readFileSync(dir+"/.claude-plugin/plugin.json","utf8"));
  if(!fs.existsSync(dir+"/skills/proj-kanban-api/SKILL.md")) throw new Error("skill missing");
}
console.log("OK");
'
```
Expected: `OK`.

- [ ] **Version invariant holds:** `package.json` == `plugin.json` == `1.4.1` (the `node -e` check from Task 5 Step 2).

- [ ] **No stale skill paths** in the edited docs/agent (grep from Task 3 Step 5 → `clean`).

- [ ] **Sync reviewer is green:** dispatch `api-skill-sync-reviewer` → `✅`.

- [ ] **(Manual, in a Claude Code session)** `/plugin marketplace add .` then `/plugin install proj-kanban-api@proj-kanban` succeeds and the skill loads. (This is the human acceptance step; the `node -e` validator above is the scriptable proxy.)

- [ ] **Release back to main:** once accepted, invoke the new `.claude/skills/release` skill to bump (if releasing), merge `feat/proj-kanban-api-plugin` into `main`, tag, and push — or merge via the normal branch-finish flow if not cutting a version yet.

---

## Self-Review notes

- **Spec coverage:** every design-doc task (1–8 in the design's "Task breakdown") maps here — plugin.json (T1), marketplace.json (T2), git mv (T1), "getting a server" note (T4), plugin README EN/zh-TW (T4), path-reference updates (T3), release skill (T5), install+sync verification (Task 3 Step 6 + Final acceptance).
- **No build/test toolchain:** verification is JSON-parse, `node -e` structural assertions, grep, and the sync-reviewer agent — appropriate for this repo.
- **Type/name consistency:** `proj-kanban-api` (plugin + skill folder), `proj-kanban` (marketplace name), version `1.4.1`, repo `https://github.com/Lewsiafat/proj-kanban`, and skill path `plugins/proj-kanban-api/skills/proj-kanban-api/` are used identically across all tasks.
