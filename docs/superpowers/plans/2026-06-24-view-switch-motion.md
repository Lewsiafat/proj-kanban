# View-Switch / Column Add-Remove Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two remaining "hard cut" visual events in the kanban — switching board views, and adding/deleting a project column — with restrained, smooth GSAP transitions.

**Architecture:** Frontend-only, all edits in `public/index.html`. Reuse the existing "animate-then-rerender" idiom (as in `applyFilter`) and the existing `prevColHeights`/`flipColHeights` FLIP infrastructure. View switch = fade old columns out → `render({viewSwitch:true})` → staggered fade in. New column = entrance folded into `flipColHeights` via a colKey diff. Delete column = animate the column out before `load()`.

**Tech Stack:** Vanilla JS + already-loaded GSAP 3.12.5 (core only — no plugins). No build step, no test runner. Verification is via the Playwright MCP browser tools against the running dev server.

## Global Constraints

- **Edit only `public/index.html`.** Do NOT touch `src/index.js`, the DB schema, or the `proj-kanban-api` skill. This feature is frontend-only.
- **No new dependencies.** Use the already-loaded GSAP 3.12.5 **core**. Do NOT add the GSAP Flip plugin or any CDN script.
- **Every animation is gated on `if (window.gsap)`** with a fallback to the current instant behavior (matching `flipColHeights`/`applyFilter`).
- **Personality: restrained but smooth.** `ease: 'power2.out'`, durations in the existing 0.16–0.3s family, **no overshoot** (no `back`/`elastic`/`bounce`).
- **No `prefers-reduced-motion` handling** — the existing code has none; stay consistent (confirmed with the user).
- App is served under `BASE_PATH`. With defaults, open at `http://localhost:10023/proj-kanban/`. Start the server with `npm start`.
- Column add/remove applies to the **project view only** (the status view has a fixed 5 columns that cannot be added or removed).

## Why no red-green TDD

This repo has no test runner, no linter, and no build step; the `check-src-syntax.sh` hook only `node --check`s `src/index.js`, **not** `index.html`. The changes are visual animations. So each task's "test" is a **Playwright MCP browser scenario** that asserts (a) zero console errors — which also catches any `index.html` parse error introduced by the edit — and (b) the correct final DOM, plus a screenshot for the record. Animation smoothness itself is confirmed visually from the screenshot / live page.

---

## Task 0: Start the dev server (shared setup)

Do this once before Task 1; keep it running for all tasks.

- [ ] **Step 1: Start the server in the background**

Run: `npm start`
Expected: logs that it is listening on port 10023. Leave it running.

- [ ] **Step 2: Confirm the page loads with no console errors**

Using the Playwright MCP tools:
1. `browser_navigate` to `http://localhost:10023/proj-kanban/`
2. `browser_console_messages` → Expected: no `error`-level messages.
3. `browser_snapshot` → Expected: the board renders with the project columns (project view is the default).

- [ ] **Step 3: Ensure there are at least 2 project columns to test with**

If the board has fewer than 2 columns, add them via the UI ("＋ 新增專案欄") or the API:

Run:
```bash
curl -s -X POST http://localhost:10023/proj-kanban/api/projects -H 'Content-Type: application/json' -d '{"name":"Motion Test A","color":"#6366f1"}'
curl -s -X POST http://localhost:10023/proj-kanban/api/projects -H 'Content-Type: application/json' -d '{"name":"Motion Test B","color":"#10b981"}'
```
Expected: each returns the created project as JSON with an `id`. Reload the page; both columns appear.

---

## Task 1: Smooth view-switch transition

**Files:**
- Modify: `public/index.html` — `render()` (currently ~line 556) and `switchView()` (currently ~line 504).

**Interfaces:**
- Consumes: existing globals `currentView`, `saveView()`, `updateViewSwitch()`, `renderProjectView()`, `renderStatusView()`, `renderStatusBar()`, `flipColHeights()`, and the loaded `window.gsap`.
- Produces: `render(opts = {})` — now accepts an options object; `opts.viewSwitch === true` makes it stagger-fade the new columns in and skip `flipColHeights`. All existing callers of `render()` (no args) are unaffected.

- [ ] **Step 1: Add the `opts` parameter and the view-switch branch to `render()`**

Replace the existing `render()` function:

```js
function render() {
  const board = document.getElementById('board')
  // capture current column heights so we can animate the frame when card count changes
  const prevColHeights = {}
  board.querySelectorAll('.col').forEach(col => { prevColHeights[col.dataset.colKey] = col.offsetHeight })
  board.innerHTML = ''

  if (currentView === 'status') renderStatusView(board)
  else renderProjectView(board)

  renderStatusBar()
  flipColHeights(board, prevColHeights)
}
```

with:

```js
function render(opts = {}) {
  const board = document.getElementById('board')
  // capture current column heights so we can animate the frame when card count changes
  const prevColHeights = {}
  board.querySelectorAll('.col').forEach(col => { prevColHeights[col.dataset.colKey] = col.offsetHeight })
  board.innerHTML = ''

  if (currentView === 'status') renderStatusView(board)
  else renderProjectView(board)

  renderStatusBar()

  // A view switch swaps every column at once (project colKeys 'p<id>' vs status
  // colKeys 's-<key>' never overlap), so FLIP has nothing to match. Instead fade
  // the new columns in with a small stagger; skip flipColHeights entirely.
  if (opts.viewSwitch && window.gsap) {
    gsap.from(board.querySelectorAll('.col'), {
      opacity: 0, y: 8, duration: .28, stagger: .03, ease: 'power2.out', clearProps: 'all',
    })
  } else if (!opts.viewSwitch) {
    flipColHeights(board, prevColHeights)
  }
}
```

- [ ] **Step 2: Make `switchView()` fade the old columns out first**

Replace the existing `switchView()` function:

```js
function switchView(view) {
  if (view === currentView) return
  currentView = view
  saveView()
  updateViewSwitch()
  render()
}
```

with:

```js
function switchView(view) {
  if (view === currentView) return
  currentView = view
  saveView()
  updateViewSwitch()

  const board = document.getElementById('board')
  const oldCols = [...board.children]            // current columns + the add-col placeholder
  const rerender = () => render({ viewSwitch: true })
  if (window.gsap && oldCols.length) {
    gsap.killTweensOf(oldCols)                   // drop any in-flight tween on rapid toggles
    gsap.to(oldCols, {
      opacity: 0, y: -6, duration: .16, stagger: .01, ease: 'power2.out', onComplete: rerender,
    })
  } else {
    rerender()
  }
}
```

- [ ] **Step 3: Verify in the browser (no errors, correct final view, smooth transition)**

Using the Playwright MCP tools against the already-running server:
1. `browser_navigate` to `http://localhost:10023/proj-kanban/` (reload to pick up the edit).
2. Click the **狀態視圖** button (`browser_click` on the element with text "狀態視圖").
3. `browser_take_screenshot` → save as evidence; the board should now show the 5 status columns.
4. Click the **專案視圖** button.
5. `browser_console_messages` → **Expected: zero `error`-level messages** (this also proves `index.html` still parses).
6. `browser_snapshot` → **Expected:** the board shows the project columns again (the same projects as before the toggle).

- [ ] **Step 4: Verify the gsap-absent fallback still works (no hang)**

Using `browser_evaluate`, temporarily neutralize gsap and confirm the switch still completes instantly:
```js
() => { const g = window.gsap; window.gsap = undefined; switchView(currentView === 'status' ? 'project' : 'status'); window.gsap = g; return document.querySelectorAll('#board .col').length }
```
**Expected:** returns a positive number (columns rendered) and no thrown error — i.e. with gsap absent the view still swaps via the `else` branch. Reload the page afterward to restore a clean gsap state.

- [ ] **Step 5: Commit**

```bash
git add public/index.html
git commit -m "feat(motion): smooth fade transition when switching board views

switchView fades the current columns out, then render({viewSwitch:true})
staggers the new columns in (skipping flipColHeights, whose colKeys never
match across views). Falls back to the instant swap when gsap is absent.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: New-column entrance animation

**Files:**
- Modify: `public/index.html` — `flipColHeights()` (currently ~line 637).

**Interfaces:**
- Consumes: the `prev` map passed by `render()` (colKey → previous height), `window.gsap`.
- Produces: `flipColHeights(board, prev)` — unchanged signature; now ALSO animates the entrance of any `.col` whose `colKey` is absent from `prev`, but only when `prev` is non-empty (so the first load and the view-switch path do not trigger it).

- [ ] **Step 1: Fold a new-column entrance into `flipColHeights()`**

Replace the existing `flipColHeights()` function:

```js
function flipColHeights(board, prev) {
  if (!window.gsap) return
  board.querySelectorAll('.col').forEach(col => {
    const from = prev[col.dataset.colKey]
    if (from == null) return             // newly added column — nothing to animate from
    const to = col.offsetHeight
    if (Math.abs(from - to) < 2) return  // height unchanged
    col.classList.add('h-anim')
    gsap.fromTo(col,
      { height: from },
      { height: to, duration: .3, ease: 'power2.out', clearProps: 'height',
        onComplete: () => col.classList.remove('h-anim') })
  })
}
```

with:

```js
function flipColHeights(board, prev) {
  if (!window.gsap) return
  const hadColumns = Object.keys(prev).length > 0   // false only on the very first render
  board.querySelectorAll('.col').forEach(col => {
    const from = prev[col.dataset.colKey]
    if (from == null) {
      // colKey absent from prev = a genuinely new column. Animate its entrance,
      // but skip the first load (prev empty) where every column would qualify.
      // (The view-switch path takes the opts.viewSwitch branch and never calls
      // flipColHeights, so it can't double-fire here.)
      if (hadColumns) {
        gsap.from(col, {
          opacity: 0, y: 6, scale: .96, transformOrigin: 'top center',
          duration: .28, ease: 'power2.out', clearProps: 'all',
        })
      }
      return
    }
    const to = col.offsetHeight
    if (Math.abs(from - to) < 2) return  // height unchanged
    col.classList.add('h-anim')
    gsap.fromTo(col,
      { height: from },
      { height: to, duration: .3, ease: 'power2.out', clearProps: 'height',
        onComplete: () => col.classList.remove('h-anim') })
  })
}
```

- [ ] **Step 2: Verify a newly-added column animates in**

Using the Playwright MCP tools (reload the page first to pick up the edit; make sure you are in the **project view**):
1. `browser_click` the "＋ 新增專案欄" button.
2. In the modal, `browser_type` a name (e.g. "Entrance Test") into the project-name field, then `browser_click` the save button.
3. `browser_take_screenshot` immediately after save → the new column should be visible (it fades/scales in over ~0.28s).
4. `browser_console_messages` → **Expected: zero `error`-level messages.**
5. `browser_snapshot` → **Expected:** a new column titled "Entrance Test" exists; all previously-existing columns are still present and unchanged.

- [ ] **Step 3: Verify no entrance on first load and no regression on card add**

1. `browser_navigate` to reload the page. `browser_console_messages` → **Expected: zero errors** and the board appears without any per-column pop-in (first load is intentionally not animated). A screenshot is optional; the key assertion is no error and the board renders.
2. Add a card to an existing column (`browser_click` "＋ 新增更新" on a column, fill the title, save). `browser_snapshot` → **Expected:** the card appears and that column's height adjusts smoothly; **no other column** pops or re-enters (only the height tween path ran, not the entrance path).

- [ ] **Step 4: Commit**

```bash
git add public/index.html
git commit -m "feat(motion): animate a newly-added project column entering

flipColHeights now also fades+scales in any .col whose colKey is absent from
the captured prev map, gated on prev being non-empty so the first load and the
view-switch path never trigger it.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Delete-column exit animation

**Files:**
- Modify: `public/index.html` — `deleteCurrentProject()` (currently ~line 936).

**Interfaces:**
- Consumes: existing `editing.id`, `api()`, `closeModal()`, `load()`, `window.gsap`. The deleted column's DOM node is found via `.col[data-proj-id="<id>"]` (set in `renderProjectView` as `col.dataset.projId = p.id`).
- Produces: `deleteCurrentProject()` — unchanged signature; now animates the target column out before reloading.

- [ ] **Step 1: Animate the column out before `load()`**

Replace the existing `deleteCurrentProject()` function:

```js
async function deleteCurrentProject() {
  if (!confirm('確定刪除這個專案和所有卡片？')) return
  await api('DELETE', `/projects/${editing.id}`)
  closeModal('projectModal')
  load()
}
```

with:

```js
async function deleteCurrentProject() {
  if (!confirm('確定刪除這個專案和所有卡片？')) return
  const id = editing.id
  await api('DELETE', `/projects/${id}`)
  closeModal('projectModal')
  // Fade the doomed column out before reloading; the project modal is only
  // reachable in the project view, so this .col is always present.
  const col = document.querySelector(`.col[data-proj-id="${id}"]`)
  if (window.gsap && col) {
    gsap.to(col, { opacity: 0, scale: .96, duration: .2, ease: 'power2.out', onComplete: load })
  } else {
    load()
  }
}
```

- [ ] **Step 2: Verify a deleted column animates out**

Using the Playwright MCP tools (reload first; be in the **project view**). Use the "Entrance Test" column created in Task 2, or any disposable column:
1. `browser_click` the column's edit affordance (the ✎ icon or the column title) to open the project modal.
2. `browser_click` the delete button and accept the confirm dialog (`browser_handle_dialog` → accept).
3. `browser_take_screenshot` immediately → the column should be fading/scaling out (~0.2s) and then disappear.
4. `browser_console_messages` → **Expected: zero `error`-level messages.**
5. `browser_snapshot` → **Expected:** the deleted column is gone; the remaining columns reflow to fill the gap (horizontal reflow is instant by design).

- [ ] **Step 3: Verify the gsap-absent fallback still deletes**

`browser_evaluate`:
```js
() => { const g = window.gsap; window.gsap = undefined; const n = document.querySelectorAll('#board .col').length; window.gsap = g; return n }
```
This just confirms the count helper; then perform one delete with gsap neutralized to ensure the `else` branch still calls `load()`. **Expected:** the column is removed without a thrown error. Reload afterward.

- [ ] **Step 4: Clean up test data and commit**

Remove any leftover test projects ("Motion Test A/B", "Entrance Test") via the UI or API so the board is left clean:
```bash
# list ids, then delete the test ones
curl -s http://localhost:10023/proj-kanban/api/projects | npx --yes json 2>/dev/null || curl -s http://localhost:10023/proj-kanban/api/projects
# curl -s -X DELETE http://localhost:10023/proj-kanban/api/projects/<id>   # for each test id
```

```bash
git add public/index.html
git commit -m "feat(motion): animate a project column out before delete reload

deleteCurrentProject fades+scales the target .col out, then load() on
complete; falls back to an immediate load() when gsap is absent.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Walkthrough doc

**Files:**
- Create: `specs/view-switch-motion-walkthrough.md`

**Interfaces:** none (documentation).

- [ ] **Step 1: Write the walkthrough**

Create `specs/view-switch-motion-walkthrough.md` describing, in the same style as `specs/add-status-view-walkthrough.md`:
- What changed and why (the two hard-cut events that are now animated).
- The three touch points in `public/index.html`: `switchView()` + `render(opts)`, `flipColHeights()` entrance, `deleteCurrentProject()` exit.
- The design decisions: restrained `power2.out` personality, gsap-absent fallbacks, no `prefers-reduced-motion`, column add/remove is project-view-only, horizontal reflow left instant.
- A pointer to the design doc `docs/plans/2026-06-24-view-switch-motion-design.md`.

- [ ] **Step 2: Commit**

```bash
git add specs/view-switch-motion-walkthrough.md
git commit -m "docs(view-switch-motion): add feature walkthrough

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review notes

- **Spec coverage:** view-switch transition → Task 1; new-column entrance → Task 2; delete-column exit → Task 3; restrained personality, gsap fallbacks, no reduced-motion, project-view-only scope → enforced in Global Constraints and each task's code; verification → Playwright steps in each task; walkthrough → Task 4.
- **Type/name consistency:** `render(opts)` with `opts.viewSwitch` is defined in Task 1 and not relied on elsewhere; `flipColHeights(board, prev)` keeps its signature (Task 2); `deleteCurrentProject()` keeps its signature (Task 3); the column selector `.col[data-proj-id="<id>"]` matches `col.dataset.projId = p.id` in `renderProjectView`.
- **No double-fire:** the view-switch path uses the `opts.viewSwitch` branch and never calls `flipColHeights`, so the new-column entrance in Task 2 cannot fire during a view switch; the `hadColumns` guard suppresses it on first load.
