// Self-contained integration tests for the proj-kanban REST API.
//
// No new deps (repo philosophy): Node built-in test runner + node:assert/strict
// + global fetch. Spawns src/index.js as a child process against a throwaway
// DATA_DIR, waits for readiness, exercises all 7 endpoints, and asserts the
// specific hardening fixes (items 45/48/49/50). Server + temp dir are torn
// down in the after() hook.

import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SERVER = join(__dirname, '..', 'src', 'index.js')

const PORT = 10099
const BASE = `http://localhost:${PORT}/proj-kanban`
const API = `${BASE}/api`

let child
let dataDir
let stderr = ''

// ── request helpers ───────────────────────────────────────
const jget = (path) => fetch(`${API}${path}`)
const jpost = (path, body) =>
  fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
const jput = (path, body) =>
  fetch(`${API}${path}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
const jdel = (path) => fetch(`${API}${path}`, { method: 'DELETE' })

// Unique names so tests never collide on the UNIQUE(name) constraint.
let seq = 0
const uniq = (prefix) => `${prefix} ${Date.now()}-${++seq}`

// Create a project and return its parsed row.
async function makeProject(prefix = 'P') {
  const res = await jpost('/projects', { name: uniq(prefix) })
  assert.equal(res.status, 200)
  return res.json()
}

// Create a card in a project and return its parsed row.
async function makeCard(projectId, title = 'card') {
  const res = await jpost(`/projects/${projectId}/cards`, { title })
  assert.equal(res.status, 200)
  return res.json()
}

before(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'kanban-test-'))
  child = spawn(process.execPath, [SERVER], {
    env: { ...process.env, DATA_DIR: dataDir, PORT: String(PORT), BASE_PATH: 'proj-kanban' },
    stdio: ['ignore', 'ignore', 'pipe'],
  })
  child.stderr.on('data', (d) => {
    stderr += d.toString()
  })

  // Poll readiness: GET /projects must answer before we run anything.
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`server exited early (code ${child.exitCode}). stderr:\n${stderr}`)
    }
    try {
      const res = await fetch(`${API}/projects`)
      if (res.ok) return
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 150))
  }
  throw new Error(`server did not become ready within 15s. stderr:\n${stderr}`)
})

after(() => {
  if (child) child.kill('SIGKILL')
  if (dataDir) rmSync(dataDir, { recursive: true, force: true })
})

// ── GET /projects ─────────────────────────────────────────
test('GET /projects returns an array; each project has a cards array', async () => {
  const created = await makeProject('List')
  const res = await jget('/projects')
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.ok(Array.isArray(body), 'response body is an array')
  for (const p of body) {
    assert.ok(Array.isArray(p.cards), `project ${p.id} has a cards array`)
  }
  const found = body.find((p) => p.id === created.id)
  assert.ok(found, 'created project appears in the list')
  assert.ok(Array.isArray(found.cards))
})

// ── POST /projects ────────────────────────────────────────
test('POST /projects creates a project; blank name -> 400', async () => {
  const name = uniq('Create')
  const res = await jpost('/projects', { name })
  assert.equal(res.status, 200)
  const p = await res.json()
  assert.equal(p.name, name)
  assert.ok(p.id, 'created project has an id')

  const blank = await jpost('/projects', { name: '   ' })
  assert.equal(blank.status, 400, 'whitespace-only name is rejected')
})

// ── POST /projects duplicate (item 50: error sanitization) ─
test('POST duplicate name -> 400 with a generic, sanitized error (item 50)', async () => {
  const name = uniq('Dup')
  const first = await jpost('/projects', { name })
  assert.equal(first.status, 200)

  const dup = await jpost('/projects', { name })
  assert.equal(dup.status, 400)
  const body = await dup.json()
  const err = String(body.error ?? '')
  assert.ok(err.length > 0, 'an error message is returned')
  assert.doesNotMatch(err, /SQLITE/i, 'error must not leak SQLITE internals')
  assert.doesNotMatch(err, /UNIQUE/i, 'error must not leak the UNIQUE constraint')
})

// ── PUT /projects/:id (item 49: empty-string validation) ──
test('PUT /projects/:id renames; {name:""} -> 400 (item 49)', async () => {
  const proj = await makeProject('Rename')
  const newName = uniq('Renamed')
  const res = await jput(`/projects/${proj.id}`, { name: newName })
  assert.equal(res.status, 200)
  const updated = await res.json()
  assert.equal(updated.name, newName)

  const bad = await jput(`/projects/${proj.id}`, { name: '' })
  assert.equal(bad.status, 400, 'empty-string rename is rejected, not persisted')
})

// ── POST /projects/:id/cards ──────────────────────────────
test('POST /projects/:id/cards creates a card; blank title -> 400', async () => {
  const proj = await makeProject('Cards')
  const res = await jpost(`/projects/${proj.id}/cards`, {
    title: 'Ship it',
    memo: 'notes',
    status: 'active',
  })
  assert.equal(res.status, 200)
  const card = await res.json()
  assert.equal(card.title, 'Ship it')
  assert.equal(card.project_id, proj.id)

  const bad = await jpost(`/projects/${proj.id}/cards`, { title: '   ' })
  assert.equal(bad.status, 400, 'whitespace-only title is rejected')
})

// ── PUT /cards/:id (item 48: move validation, no orphaning) ─
test('PUT /cards/:id updates status+memo; non-existent project_id -> 400, no orphan (item 48)', async () => {
  const proj = await makeProject('Move')
  const card = await makeCard(proj.id)

  const upd = await jput(`/cards/${card.id}`, { status: 'done', memo: 'finished' })
  assert.equal(upd.status, 200)
  const updated = await upd.json()
  assert.equal(updated.status, 'done')
  assert.equal(updated.memo, 'finished')

  // Move to a project that does not exist -> rejected.
  const bad = await jput(`/cards/${card.id}`, { project_id: 999999 })
  assert.equal(bad.status, 400, 'move to missing project is rejected')

  // The card must not be orphaned: still present under its original project.
  const projects = await (await jget('/projects')).json()
  const found = projects.flatMap((p) => p.cards).find((c) => c.id === card.id)
  assert.ok(found, 'card still exists after the rejected move')
  assert.equal(found.project_id, proj.id, 'card still belongs to its original project')
})

// ── PUT /cards/:id empty title ────────────────────────────
test('PUT /cards/:id with {title:""} -> 400', async () => {
  const proj = await makeProject('CardTitle')
  const card = await makeCard(proj.id)
  const bad = await jput(`/cards/${card.id}`, { title: '' })
  assert.equal(bad.status, 400, 'empty-string card title is rejected')
})

// ── Cascade delete (item 45: foreign_keys=ON) ─────────────
test('Cascade: deleting a project removes its cards (foreign_keys=ON, item 45)', async () => {
  const proj = await makeProject('Cascade')
  const card = await makeCard(proj.id, 'to be cascaded')

  const del = await jdel(`/projects/${proj.id}`)
  assert.equal(del.status, 200)

  // The card row should be gone — a PUT against it now 404s.
  const check = await jput(`/cards/${card.id}`, { status: 'done' })
  assert.equal(check.status, 404, 'orphaned card row was cascade-deleted')

  // And it no longer appears anywhere in the board.
  const projects = await (await jget('/projects')).json()
  const stillThere = projects.flatMap((p) => p.cards).some((c) => c.id === card.id)
  assert.equal(stillThere, false, 'card is absent from every project')
})

// ── DELETE /cards/:id ─────────────────────────────────────
test('DELETE /cards/:id ok; DELETE of a missing id -> 404', async () => {
  const proj = await makeProject('Delete')
  const card = await makeCard(proj.id)

  const del = await jdel(`/cards/${card.id}`)
  assert.equal(del.status, 200)

  const missing = await jdel('/cards/999999')
  assert.equal(missing.status, 404, 'deleting a non-existent card 404s')
})
