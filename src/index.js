import express from 'express'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE_PATH = process.env.BASE_PATH || 'proj-kanban'
const PORT = process.env.PORT || 10023
const DATA_DIR = process.env.DATA_DIR || join(__dirname, '../data')

mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(join(DATA_DIR, 'kanban.db'))

// --- DB Init ---
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#6366f1',
    position INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    memo TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    position INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
`)

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
    const maxPos = db.prepare(`SELECT COALESCE(MAX(position),0) as m FROM projects`).get().m
    const info = db.prepare(`INSERT INTO projects (name, color, position) VALUES (?, ?, ?)`).run(
      name.trim(), color || '#6366f1', maxPos + 1
    )
    res.json(db.prepare(`SELECT * FROM projects WHERE id = ?`).get(info.lastInsertRowid))
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// PUT /api/projects/:id  → update project
r.put('/projects/:id', (req, res) => {
  const { name, color } = req.body
  const proj = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.id)
  if (!proj) return res.status(404).json({ error: 'not found' })
  db.prepare(`UPDATE projects SET name = ?, color = ? WHERE id = ?`).run(
    name ?? proj.name, color ?? proj.color, proj.id
  )
  res.json(db.prepare(`SELECT * FROM projects WHERE id = ?`).get(proj.id))
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
  const maxPos = db.prepare(`SELECT COALESCE(MAX(position),0) as m FROM cards WHERE project_id = ?`).get(proj.id).m
  const info = db.prepare(
    `INSERT INTO cards (project_id, title, memo, status, position) VALUES (?, ?, ?, ?, ?)`
  ).run(proj.id, title.trim(), memo || '', status || 'active', maxPos + 1)
  res.json(db.prepare(`SELECT * FROM cards WHERE id = ?`).get(info.lastInsertRowid))
})

// PUT /api/cards/:id  → update card
r.put('/cards/:id', (req, res) => {
  const card = db.prepare(`SELECT * FROM cards WHERE id = ?`).get(req.params.id)
  if (!card) return res.status(404).json({ error: 'not found' })
  const { title, memo, status, project_id } = req.body
  db.prepare(`
    UPDATE cards SET title = ?, memo = ?, status = ?, project_id = ?, updated_at = datetime('now','localtime')
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

// SPA fallback
app.get(`/${BASE_PATH}`, (req, res) => res.sendFile(join(__dirname, '../public/index.html')))
app.get(`/${BASE_PATH}/*`, (req, res) => res.sendFile(join(__dirname, '../public/index.html')))

app.listen(PORT, () => console.log(`proj-kanban running on :${PORT}/${BASE_PATH}`))
