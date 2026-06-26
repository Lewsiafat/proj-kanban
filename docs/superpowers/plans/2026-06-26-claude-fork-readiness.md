# `.claude/` Fork-Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the tracked `.claude/` directory fork-safe — gitignore third-party plugin skills, drop a personal-only permission wildcard, and convert the three fork-facing CJK files to English (one of them also fixes an i18n drift), with no behavior changes.

**Architecture:** Five small, independent edits inside `.claude/` (plus one `.gitignore` line). Each is a self-contained review gate. Three are faithful translations whose commands/paths/behavior must stay identical; one is a config removal; one is a gitignore addition.

**Tech Stack:** Bash hook scripts, JSON settings, Markdown skill/agent frontmatter. No application code is touched.

## Global Constraints

- **Scope is `.claude/` only**, plus one `.gitignore` addition. Do **not** touch `src/`, `public/`, README, LICENSE, CONTRIBUTING, or any file outside `.claude/`.
- **This repo has no test suite, no build step, no linter** (see CLAUDE.md). Verification is by: `bash -n` (syntax), `python3 -c` JSON parse, the python3 CJK scan below, `git status`, and feeding the hook a JSON payload to simulate triggering.
- **Englishization tasks (3, 4, 5) must not change behavior**: commands, file paths, tool lists, `model:`, `disable-model-invocation:`, trigger conditions, and the documented log/response strings stay byte-identical except for the prose being English.
- **Reliable CJK scan** (BSD `grep -P` is unavailable on macOS — do not use it):
  ```bash
  git ls-files .claude | python3 -c '
  import sys, re
  cjk = re.compile(r"[一-鿿]")
  for line in sys.stdin:
      p = line.strip()
      try:
          with open(p, encoding="utf-8") as f: txt = f.read()
      except Exception: continue
      n = len(cjk.findall(txt))
      if n: print(f"{n:5d}  {p}")
  '
  ```
- **Every commit ends with the trailer:**
  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  ```
- Commit scope tag for all tasks: `chore(claude-fork-readiness): ...`.
- Branch: `feat/claude-fork-readiness` (already created; design doc already committed at `5e0e89b`).

---

### Task 1: Gitignore the third-party superpowers skills

**Files:**
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces: `.claude/skills/executing-plans/` and `.claude/skills/writing-plans/` are no longer reported by `git status`.

- [ ] **Step 1: Confirm the two directories are currently untracked noise**

Run: `git status --porcelain .claude/skills/`
Expected: shows `?? .claude/skills/executing-plans/` and `?? .claude/skills/writing-plans/`.

- [ ] **Step 2: Append the ignore rule to `.gitignore`**

Append these three lines to the end of `.gitignore` (current last line is `.playwright-mcp/`):

```
# superpowers plugin skills (third-party, provided by the plugin — not part of this repo)
.claude/skills/executing-plans/
.claude/skills/writing-plans/
```

- [ ] **Step 3: Verify the directories are now ignored**

Run: `git status --porcelain .claude/skills/`
Expected: **no output** (the two `??` lines are gone).

Run: `git check-ignore .claude/skills/executing-plans/ .claude/skills/writing-plans/`
Expected: both paths echoed back (confirming they match an ignore rule).

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "$(cat <<'EOF'
chore(claude-fork-readiness): gitignore third-party superpowers skills

executing-plans/ and writing-plans/ are provided by the superpowers
plugin — not part of this repo. Stops them showing as git status noise.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Remove the playwright permission wildcard from `settings.json`

**Files:**
- Modify: `.claude/settings.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `settings.json` contains only `hooks`; no `permissions` block. The local `settings.local.json` (gitignored) keeps the machine's specific playwright allows.

- [ ] **Step 1: Note the current content**

`settings.json` currently has a `hooks` block (two PostToolUse hooks under an `Edit|Write` matcher) **and** a trailing `permissions` block:

```json
  "permissions": {
    "allow": [
      "mcp__playwright__*"
    ]
  }
```

- [ ] **Step 2: Remove the `permissions` block**

Edit `.claude/settings.json` so the entire `permissions` block (and the comma after the `hooks` block's closing brace) is removed. The file becomes exactly:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/check-src-syntax.sh\"",
            "statusMessage": "node --check src/index.js"
          },
          {
            "type": "command",
            "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/remind-status-sync.sh\""
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 3: Verify it is valid JSON and has no permissions key**

Run: `python3 -c "import json,sys; d=json.load(open('.claude/settings.json')); print('permissions' in d, list(d.keys()))"`
Expected: `False ['hooks']`

- [ ] **Step 4: Verify the hooks still parse and the path is intact**

Run: `python3 -c "import json; d=json.load(open('.claude/settings.json')); print(len(d['hooks']['PostToolUse'][0]['hooks']))"`
Expected: `2` (both hooks preserved).

- [ ] **Step 5: Commit**

```bash
git add .claude/settings.json
git commit -m "$(cat <<'EOF'
chore(claude-fork-readiness): drop playwright permission wildcard from settings.json

mcp__playwright__* is a personal testing convenience; shipping it in
tracked settings would auto-grant all playwright tools to anyone who
forks. The local (gitignored) settings.local.json keeps the machine's
specific playwright allows, so local behavior is unaffected.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Englishize `remind-status-sync.sh` and fix the i18n drift

**Files:**
- Modify: `.claude/hooks/remind-status-sync.sh`

**Interfaces:**
- Consumes: nothing.
- Produces: same hook behavior (PostToolUse, only fires on `public/index.html` edits that touch status UI), but English prose, trigger grep updated to current tokens (`STATUSES|statusLabel|status_|status-`), and the reminder text matches CLAUDE.md's three places.

- [ ] **Step 1: Replace the whole file**

Overwrite `.claude/hooks/remind-status-sync.sh` with exactly:

```bash
#!/usr/bin/env bash
# PostToolUse(Edit|Write) hook: when an edit to public/index.html touches the
# card-status UI, remind that status is an open string requiring three synced
# edits (documented footgun in CLAUDE.md). Stays silent otherwise.
j=$(cat)
f=$(printf '%s' "$j" | jq -r '.tool_input.file_path // empty')
case "$f" in
  */public/index.html)
    b=$(printf '%s' "$j" | jq -r '.tool_input.new_string // .tool_input.content // empty')
    printf '%s' "$b" | grep -qE 'STATUSES|statusLabel|status_|status-' && \
      printf '%s' '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"Reminder: card status is an open string. Adding or changing a status needs three synced edits — the STATUSES constant (key + emoji), a status_<key> entry in BOTH the en and zh-TW maps of the I18N dictionary, and the matching .status-* CSS classes (see CLAUDE.md)."}}'
    ;;
esac
true
```

- [ ] **Step 2: Verify bash syntax**

Run: `bash -n .claude/hooks/remind-status-sync.sh`
Expected: no output, exit 0.

- [ ] **Step 3: Verify it FIRES on a status-touching index.html edit**

Run:
```bash
echo '{"tool_input":{"file_path":"/x/public/index.html","new_string":"const STATUSES=[]"}}' | bash .claude/hooks/remind-status-sync.sh
```
Expected: a JSON line containing `"hookEventName":"PostToolUse"` and the English reminder text.

- [ ] **Step 4: Verify it STAYS SILENT when the edit has no status tokens**

Run:
```bash
echo '{"tool_input":{"file_path":"/x/public/index.html","new_string":"const FOO=1"}}' | bash .claude/hooks/remind-status-sync.sh
```
Expected: **no output.**

- [ ] **Step 5: Verify it STAYS SILENT for a non-index.html file**

Run:
```bash
echo '{"tool_input":{"file_path":"/x/src/index.js","new_string":"STATUSES status_ status-"}}' | bash .claude/hooks/remind-status-sync.sh
```
Expected: **no output.**

- [ ] **Step 6: Confirm no CJK remains in the file**

Run: `python3 -c "import re; print(len(re.findall(r'[一-鿿]', open('.claude/hooks/remind-status-sync.sh').read())))"`
Expected: `0`

- [ ] **Step 7: Commit**

```bash
git add .claude/hooks/remind-status-sync.sh
git commit -m "$(cat <<'EOF'
chore(claude-fork-readiness): englishize remind-status-sync.sh and fix i18n drift

Reminder now names the current three places (STATUSES constant; status_<key>
in both en and zh-TW of I18N; .status-* CSS), matching CLAUDE.md, and the
trigger grep uses current tokens (STATUSES|statusLabel|status_|status-)
instead of the stale <option value=/labels. Behavior unchanged.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Englishize `skills/reset-db/SKILL.md`

**Files:**
- Modify: `.claude/skills/reset-db/SKILL.md`

**Interfaces:**
- Consumes: nothing.
- Produces: an all-English skill doc; `name`, `disable-model-invocation: true`, every command, path, and the `[]` expected response stay identical.

- [ ] **Step 1: Replace the whole file**

Overwrite `.claude/skills/reset-db/SKILL.md` with exactly:

````markdown
---
name: reset-db
description: Recreate proj-kanban's SQLite database. This project has no migrations — after changing the CREATE TABLE schema in src/index.js, you must delete the DB file so the server rebuilds it on next start. This skill backs up the existing kanban.db, deletes it, then prompts a server restart to trigger the rebuild. Use when the user says "reset db", "recreate database", "rebuild database", "reset database", "rebuild schema", or after editing the CREATE TABLE schema in src/index.js.
disable-model-invocation: true
---

# reset-db — rebuild the migration-less database

proj-kanban has no migration mechanism: the schema is created at startup by `src/index.js` via `CREATE TABLE IF NOT EXISTS`. **After you change a column definition, the existing DB file is not updated automatically** — you must delete the DB file so it is rebuilt with the new schema on the next start.

This operation **wipes all board data**. Always back up first.

## Pre-flight confirmation

Before running, confirm with the user:
1. Are you sure you want to rebuild? This clears all existing projects and cards.
2. Is the server currently running? (it must be stopped before the file can be safely deleted)

## Steps

DB file location: `${DATA_DIR}/kanban.db`, where `DATA_DIR` defaults to `./data` under the project root. If the user has set a `DATA_DIR` env var, use that path instead.

1. **Stop the server** (if running). Ask the user to press Ctrl-C in the terminal running the server, or find and stop the `node src/index.js` process. Do not delete the file while the server still has the database open.

2. **Back up the existing DB** (timestamped, to avoid overwriting an older backup):
   ```bash
   cd <project-root>
   [ -f data/kanban.db ] && cp data/kanban.db "data/kanban.db.bak-$(date +%Y%m%d-%H%M%S)" && echo "backed up" || echo "no existing DB, skipping backup"
   ```

3. **Delete the DB file** (including SQLite's WAL/SHM side files, if present):
   ```bash
   rm -f data/kanban.db data/kanban.db-wal data/kanban.db-shm
   ```

4. **Restart the server to trigger the rebuild**:
   ```bash
   npm start
   ```
   On startup, `CREATE TABLE IF NOT EXISTS` recreates the empty tables using the current schema in `src/index.js`.

5. **Verify**: confirm the server starts cleanly (log shows `proj-kanban running on :<PORT>/<BASE_PATH>`), and use the API to confirm the tables were created and are empty:
   ```bash
   curl -s "http://localhost:${PORT:-10023}/${BASE_PATH:-proj-kanban}/api/projects"
   ```
   Expected response: `[]` (an empty array).

## Wrap-up

Tell the user:
- The backup filename (use it any time to restore: stop the server → `cp <backup-file> data/kanban.db` → restart)
- Data has been cleared and the new schema definition is now applied
- The confirmed schema change (if this rebuild was for a specific column change)
````

- [ ] **Step 2: Confirm no CJK remains**

Run: `python3 -c "import re; print(len(re.findall(r'[一-鿿]', open('.claude/skills/reset-db/SKILL.md').read())))"`
Expected: `0`

- [ ] **Step 3: Confirm behavior-bearing tokens are intact**

Run: `grep -c -e 'disable-model-invocation: true' -e 'data/kanban.db-wal data/kanban.db-shm' -e 'CREATE TABLE IF NOT EXISTS' -e '/api/projects' .claude/skills/reset-db/SKILL.md`
Expected: `4` (each of the four behavior markers present).

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/reset-db/SKILL.md
git commit -m "$(cat <<'EOF'
chore(claude-fork-readiness): englishize reset-db SKILL.md

Prose and description translated to English; commands, paths,
disable-model-invocation, and expected outputs unchanged.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Englishize `agents/api-skill-sync-reviewer.md`

**Files:**
- Modify: `.claude/agents/api-skill-sync-reviewer.md`

**Interfaces:**
- Consumes: nothing.
- Produces: an all-English agent doc; `name`, `tools: Read, Grep, Glob`, and `model: sonnet` stay identical; the read-only drift-review behavior is unchanged.

- [ ] **Step 1: Replace the whole file**

Overwrite `.claude/agents/api-skill-sync-reviewer.md` with exactly:

```markdown
---
name: api-skill-sync-reviewer
description: Compare the REST API in src/index.js against the .claude/skills/proj-kanban-api docs to check they are in sync. Use after routes in src/index.js are added, removed, or changed, to ensure the endpoint contract described in SKILL.md and references/api.md (path, method, request body, response, status codes) still matches. CLAUDE.md requires the two be kept in sync; this agent's sole job is to detect drift.
tools: Read, Grep, Glob
model: sonnet
---

You are the **API contract sync reviewer** for the proj-kanban project. Your single responsibility: find inconsistencies (drift) between the actual REST API in `src/index.js` and the docs in `.claude/skills/proj-kanban-api/`. **Do not modify any files** — report only.

## Background

`CLAUDE.md` states explicitly: "keep it in sync with `src/index.js` when endpoints change." Doc drift is a known maintenance burden.

The source of truth is always the code in `src/index.js`. If the docs disagree with the code, the docs are wrong.

## Files to compare

1. **Code**: `src/index.js` — all `r.get/post/put/delete(...)` routes
2. **Docs**:
   - `.claude/skills/proj-kanban-api/SKILL.md`
   - `.claude/skills/proj-kanban-api/references/api.md`

## Process

1. Read `src/index.js` and list the facts for each endpoint: HTTP method, path (including the `/${BASE_PATH}/api` prefix), required/optional request body fields, success response shape, and the error status codes (400/404, etc.) it returns and under what conditions.
2. Read both docs and extract their description of each endpoint.
3. Compare one by one. Focus on these common drift points:
   - an endpoint exists in the code but not the docs, or vice versa
   - method or path mismatch
   - required/optional request body fields mismatch (e.g. code's `name?.trim()` makes name required)
   - default-value mismatch (e.g. project color defaults to `#6366f1`, card status defaults to `active`, position uses `MAX(position)+1`)
   - error-case mismatch (e.g. duplicate project name returns 400, not found returns 404, missing title returns 400)
   - response-field mismatch (e.g. GET /projects returns projects with nested cards)

## Output format

Output only the problems found, ordered by severity. For each, state:

- **Location**: which doc, which endpoint
- **Code says**: the fact from src/index.js (with line number)
- **Doc says**: the doc's current description
- **Suggested fix**: what the doc should be changed to

If fully in sync, reply with a single line: "✅ API and docs are in sync, no drift found."

Do not modify files. Do not propose refactors unrelated to sync.
```

- [ ] **Step 2: Confirm no CJK remains**

Run: `python3 -c "import re; print(len(re.findall(r'[一-鿿]', open('.claude/agents/api-skill-sync-reviewer.md').read())))"`
Expected: `0`

- [ ] **Step 3: Confirm frontmatter is intact**

Run: `grep -c -e 'name: api-skill-sync-reviewer' -e 'tools: Read, Grep, Glob' -e 'model: sonnet' .claude/agents/api-skill-sync-reviewer.md`
Expected: `3`

- [ ] **Step 4: Commit**

```bash
git add .claude/agents/api-skill-sync-reviewer.md
git commit -m "$(cat <<'EOF'
chore(claude-fork-readiness): englishize api-skill-sync-reviewer agent

Prose and description translated to English; name, tools, and model
frontmatter unchanged; read-only drift-review behavior unchanged.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Final acceptance verification

**Files:** none (verification only).

- [ ] **Step 1: tracked `.claude/` has zero CJK**

Run the Global-Constraints CJK scan.
Expected: **no output** (all three previously-CJK files now clean).

- [ ] **Step 2: the two superpowers dirs are gone from status**

Run: `git status --porcelain`
Expected: clean working tree (no `?? .claude/skills/executing-plans/` or `writing-plans/`), all task commits made.

- [ ] **Step 3: settings.json has no permissions block**

Run: `python3 -c "import json; print('permissions' in json.load(open('.claude/settings.json')))"`
Expected: `False`

- [ ] **Step 4: review the full diff against main**

Run: `git diff --stat main...HEAD`
Expected: only `.gitignore`, the four `.claude/` files, and the two `docs/` plan files changed — nothing outside `.claude/` except `.gitignore` and `docs/`.

---

## Notes for the executor

- These tasks are independent and may be executed in any order, but the numbering reflects increasing-prose-size; doing 1→6 in order keeps commits small-to-large.
- The englishization tasks are translations — the **full replacement content is provided**; do not paraphrase or re-translate, paste the given blocks verbatim.
- If any verification command fails, stop and report — do not "fix forward" by changing behavior.
- The walkthrough/spec doc and the `temp/` progress file are handled by `/finish-task` at the end, not in this plan.
