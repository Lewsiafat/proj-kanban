import express from 'express'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync, readFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE_PATH = process.env.BASE_PATH || 'proj-kanban'
const PORT = process.env.PORT || 10023
const DATA_DIR = process.env.DATA_DIR || join(__dirname, '../data')
const APP_VERSION = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8')).version

mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(join(DATA_DIR, 'kanban.db'))
db.pragma("foreign_keys = ON")

// --- DB Init ---
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#6366f1',
    position INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    memo TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    position INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
`)

// --- Migrations ---
// Additive only: never drop or recreate anything. Each migration's `version`
// is recorded in meta.schema_version after it runs inside a transaction.
db.exec(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)`)
const currentVersion = Number(
  db.prepare(`SELECT value FROM meta WHERE key = 'schema_version'`).get()?.value ?? 0
)
const migrations = [
  // v1 — baseline: the projects/cards tables above (created via IF NOT EXISTS),
  // so this is a no-op that just records the current schema as version 1.
  { version: 1, up: () => {} },
]
for (const m of migrations) {
  if (m.version > currentVersion) {
    db.transaction(() => {
      m.up()
      db.prepare(`INSERT INTO meta (key, value) VALUES ('schema_version', ?)
                  ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(String(m.version))
    })()
  }
}

const app = express()
app.use(express.json())
app.use(express.static(join(__dirname, '../public')))

const r = express.Router()

// ── Projects ──────────────────────────────────────────────

// GET /api/projects  → all projects with their cards
r.get('/projects', (req, res) => {
  const projects = db.prepare(`SELECT * FROM projects ORDER BY position, id`).all()
  const allCards = db.prepare(`SELECT * FROM cards ORDER BY position, id`).all()
  const result = projects.map(p => ({
    ...p,
    cards: allCards.filter(c => c.project_id === p.id)
  }))
  res.json(result)
})

// POST /api/projects  → create project
r.post('/projects', (req, res) => {
  const { name, color } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'name required' })
  try {
    const info = db.transaction(() => {
      const maxPos = db.prepare(`SELECT COALESCE(MAX(position),0) as m FROM projects`).get().m
      return db.prepare(`INSERT INTO projects (name, color, position) VALUES (?, ?, ?)`).run(
        name.trim(), color || '#6366f1', maxPos + 1
      )
    })()
    res.json(db.prepare(`SELECT * FROM projects WHERE id = ?`).get(info.lastInsertRowid))
  } catch (e) {
    console.error(e)
    const unique = e.code === 'SQLITE_CONSTRAINT_UNIQUE' || /UNIQUE/.test(e.message)
    res.status(400).json({ error: unique ? 'name already exists' : 'invalid request' })
  }
})

// PUT /api/projects/:id  → update project
r.put('/projects/:id', (req, res) => {
  const { name, color } = req.body
  const proj = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.id)
  if (!proj) return res.status(404).json({ error: 'not found' })
  if (name != null && !name.trim()) return res.status(400).json({ error: 'name required' })
  try {
    db.prepare(`UPDATE projects SET name = ?, color = ? WHERE id = ?`).run(
      name ?? proj.name, color ?? proj.color, proj.id
    )
    res.json(db.prepare(`SELECT * FROM projects WHERE id = ?`).get(proj.id))
  } catch (e) {
    console.error(e)
    const unique = e.code === 'SQLITE_CONSTRAINT_UNIQUE' || /UNIQUE/.test(e.message)
    res.status(400).json({ error: unique ? 'name already exists' : 'invalid request' })
  }
})

// DELETE /api/projects/:id
r.delete('/projects/:id', (req, res) => {
  const info = db.prepare(`DELETE FROM projects WHERE id = ?`).run(req.params.id)
  if (!info.changes) return res.status(404).json({ error: 'not found' })
  res.json({ ok: true })
})

// ── Cards ─────────────────────────────────────────────────

// POST /api/projects/:id/cards  → add card to project
r.post('/projects/:id/cards', (req, res) => {
  const { title, memo, status } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'title required' })
  const proj = db.prepare(`SELECT id FROM projects WHERE id = ?`).get(req.params.id)
  if (!proj) return res.status(404).json({ error: 'project not found' })
  const info = db.transaction(() => {
    const maxPos = db.prepare(`SELECT COALESCE(MAX(position),0) as m FROM cards WHERE project_id = ?`).get(proj.id).m
    return db.prepare(
      `INSERT INTO cards (project_id, title, memo, status, position) VALUES (?, ?, ?, ?, ?)`
    ).run(proj.id, title.trim(), memo || '', status || 'active', maxPos + 1)
  })()
  res.json(db.prepare(`SELECT * FROM cards WHERE id = ?`).get(info.lastInsertRowid))
})

// PUT /api/cards/:id  → update card
r.put('/cards/:id', (req, res) => {
  const card = db.prepare(`SELECT * FROM cards WHERE id = ?`).get(req.params.id)
  if (!card) return res.status(404).json({ error: 'not found' })
  const { title, memo, status, project_id } = req.body
  if (title != null && !title.trim()) return res.status(400).json({ error: 'title required' })
  if (project_id != null && project_id !== card.project_id) {
    const target = db.prepare(`SELECT id FROM projects WHERE id = ?`).get(project_id)
    if (!target) return res.status(400).json({ error: 'target project not found' })
  }
  db.prepare(`
    UPDATE cards SET title = ?, memo = ?, status = ?, project_id = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    title ?? card.title,
    memo ?? card.memo,
    status ?? card.status,
    project_id ?? card.project_id,
    card.id
  )
  res.json(db.prepare(`SELECT * FROM cards WHERE id = ?`).get(card.id))
})

// DELETE /api/cards/:id
r.delete('/cards/:id', (req, res) => {
  const info = db.prepare(`DELETE FROM cards WHERE id = ?`).run(req.params.id)
  if (!info.changes) return res.status(404).json({ error: 'not found' })
  res.json({ ok: true })
})

app.use(`/${BASE_PATH}/api`, r)

// Serve the split static assets (styles.css, i18n.js, …) under the base path too,
// mirroring the API mount. `index: false` keeps index.html flowing through the SPA
// fallback below, so the __APP_VERSION__ substitution still applies to it.
app.use(`/${BASE_PATH}`, express.static(join(__dirname, '../public'), { index: false }))

// SPA fallback — inject the package.json version into the __APP_VERSION__ token.
// Read per request so live edits to index.html still show without a restart.
const sendIndex = (req, res) => res.type('html').send(
  readFileSync(join(__dirname, '../public/index.html'), 'utf8').replace(/__APP_VERSION__/g, 'v' + APP_VERSION)
)
app.get(`/${BASE_PATH}`, sendIndex)
app.get(`/${BASE_PATH}/*`, sendIndex)

app.listen(PORT, () => console.log(`proj-kanban running on :${PORT}/${BASE_PATH}`))
