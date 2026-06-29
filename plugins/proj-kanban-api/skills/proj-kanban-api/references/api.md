# proj-kanban REST API — full contract

Authoritative per-endpoint reference. Source: `src/index.js` (Express + better-sqlite3). There are
**exactly 7 endpoints**. No auth, no pagination, no batch, no per-resource GET, no reorder.

## Conventions

- **Base URL:** `http://${HOST}:${PORT}/${BASE_PATH}/api` — defaults `PORT=10023`,
  `BASE_PATH=proj-kanban` → `http://localhost:10023/proj-kanban/api`.
  - The router is mounted at `/${BASE_PATH}/api`. **Nothing is served at `/` or bare `/api`** —
    requests outside the subpath return **404** (paths under `/${BASE_PATH}/...` other than the API
    fall through to the SPA's `index.html`). Always use the full subpath.
- All request and response bodies are **JSON**. Send `Content-Type: application/json` on every request
  with a body. (Express parses with `express.json()`; a missing/incorrect content-type yields an empty
  `req.body` and trips the "required" validation.)
- No auth, no pagination, no batch/transaction endpoints, no rate limit.
- All `:id` path params are integers (the DB primary key).
- **Error shape is always** `{ "error": "<message>" }`. Documented codes are `400` (validation / DB
  constraint) and `404` (not found). Successful creates/updates return the full resource object;
  successful deletes return `{ "ok": true }`. All successes are HTTP **200** (creates are 200, not 201).
- Examples assume `API="http://localhost:10023/proj-kanban/api"`.

## Data model

**project** (a board column):

| field        | type   | notes                                                    |
|--------------|--------|----------------------------------------------------------|
| `id`         | int    | PK, autoincrement                                        |
| `name`       | string | **NOT NULL, UNIQUE**                                     |
| `color`      | string | hex, default `#6366f1`                                   |
| `position`   | int    | set to `MAX(position)+1` on insert; **never updated** by the API |
| `created_at` | string | `datetime('now','localtime')`, e.g. `2026-06-19 10:00:00` |

**card** (a status update inside a project):

| field        | type   | notes                                                    |
|--------------|--------|----------------------------------------------------------|
| `id`         | int    | PK, autoincrement                                        |
| `project_id` | int    | FK → `projects.id`, **ON DELETE CASCADE**                |
| `title`      | string | **NOT NULL**                                             |
| `memo`       | string | default `""`                                             |
| `status`     | string | default `"active"`; **open string** (any value accepted) |
| `position`   | int    | set to `MAX(position)+1` **within its project** on insert; never updated by the API |
| `created_at` | string | `datetime('now','localtime')`                            |
| `updated_at` | string | `datetime('now','localtime')`; **refreshed to now on every `PUT /cards/:id`** |

**status is an open string.** The API/DB accept any value. The web UI only labels/colors
`active | pending | done | blocked | archived` — use only those to stay UI-compatible.

## Create vs. update field semantics (important)

The POST and PUT endpoints handle missing/blank fields **differently**:

- **POST uses `||` (falsy fallback).** For `color`/`memo`/`status`, an omitted, `null`, or empty-string
  value falls back to the default (`#6366f1` / `""` / `"active"`). Required fields (`name`, `title`)
  are validated with `value?.trim()` and **stored trimmed**.
- **PUT uses `??` (nullish coalescing).** Each field is written as `value ?? oldValue`:
  - Field **absent** from the body → `undefined` → **keeps old value**.
  - Field explicitly `null` → **keeps old value**.
  - Any non-nullish value, **including `""`, `0`, `false`** → **overwrites** with that value.

  **Footgun:** sending `"memo":""` (or `"name":""`, `"title":""`) on a PUT does NOT mean "leave
  unchanged" — it **clears the field**. To preserve a field, omit it entirely. PUT also does **not**
  re-validate or re-trim `name`/`title`, so a PUT can blank a required field. Do not conflate PUT's
  `??` with POST's `||`.

---

## 1. GET /projects

Return ALL projects (board columns) ordered by `(position, id)`, each with a nested `cards` array
(cards ordered by `(position, id)`). This is the **only** read endpoint and the only way to discover
ids — search the returned tree by `name`/`title`.

- **Request body:** none.
- **200** — array of project objects, each with a `cards` array:

  ```json
  [
    {
      "id": 1,
      "name": "Backend",
      "color": "#6366f1",
      "position": 1,
      "created_at": "2026-06-19 10:00:00",
      "cards": [
        {
          "id": 42,
          "project_id": 1,
          "title": "Deploy v2",
          "memo": "OAuth first",
          "status": "active",
          "position": 1,
          "created_at": "2026-06-19 10:01:00",
          "updated_at": "2026-06-19 10:01:00"
        }
      ]
    }
  ]
  ```

  A project with no cards has `"cards": []`. An empty board returns `[]`.
- **Note:** `position` reflects insertion order only, **not** the visual order shown in the web UI
  (that lives in browser `localStorage`).

```bash
curl -s "$API/projects" | jq .

# resolve a project id by (UNIQUE) name
curl -s "$API/projects" | jq '.[] | select(.name=="Backend") | .id'

# resolve a card id by title (across all columns; titles are NOT unique)
curl -s "$API/projects" | jq '.[].cards[] | select(.title=="Deploy v2") | {id, project_id, status}'
```

---

## 2. POST /projects

Create a column. `position` is auto-set to `MAX(position)+1`.

- **Request body:**

  | field   | required | type            | default     |
  |---------|----------|-----------------|-------------|
  | `name`  | **yes**  | string, non-blank | —         |
  | `color` | no       | string (hex)    | `#6366f1`   |

  `name` is validated with `name?.trim()` (must be present and not whitespace-only) and is **stored
  trimmed**. `color` uses `||` fallback: omitted, `null`, or `""` → `#6366f1`.
- **400** `{ "error": "name required" }` — `name` missing, `null`, or blank/whitespace-only.
- **400** `{ "error": "<sqlite msg>" }` — duplicate `name` (UNIQUE) or other DB error. The body is the
  **raw SQLite message**, e.g. `UNIQUE constraint failed: projects.name`.
- **200** — the created project object (with assigned `id`, `position`, `created_at`).

```bash
# success
curl -s -X POST "$API/projects" -H 'Content-Type: application/json' \
  -d '{"name":"Infra","color":"#10b981"}'

# 400 name required
curl -s -X POST "$API/projects" -H 'Content-Type: application/json' \
  -d '{"name":"   "}'
```

```json
{ "id": 4, "name": "Infra", "color": "#10b981", "position": 4, "created_at": "2026-06-19 11:00:00" }
```

**WHY duplicate-name fails:** `name` is UNIQUE in the DB. If a name might already exist, `GET /projects`
first and reuse the existing id instead of creating.

---

## 3. PUT /projects/:id

Update a column's `name` and/or `color`. **Partial update** via `??`.

- **Request body:**

  | field   | required | type   | behavior                                            |
  |---------|----------|--------|-----------------------------------------------------|
  | `name`  | no       | string | `name ?? old` — omitted/`null` keeps old; `""` overwrites |
  | `color` | no       | string | `color ?? old` — omitted/`null` keeps old; `""` overwrites |

  Uses `??`, **not** POST-style `||`: a `""` here is written verbatim (a blank color is NOT reset to
  `#6366f1`). `name` is **not** re-validated or re-trimmed on update, so `{"name":""}` sets an empty
  name — avoid.
- **404** `{ "error": "not found" }` — `id` does not exist.
- **400** `{ "error": "<sqlite msg>" }` — DB error, e.g. renaming to a `name` that already exists
  (`UNIQUE constraint failed: projects.name`).
- **200** — the updated project object.

```bash
# rename only (color preserved)
curl -s -X PUT "$API/projects/1" -H 'Content-Type: application/json' \
  -d '{"name":"Backend (Q3)"}'

# recolor only (name preserved — do NOT send "name":"")
curl -s -X PUT "$API/projects/1" -H 'Content-Type: application/json' \
  -d '{"color":"#ef4444"}'
```

**WHY the `""` footgun matters:** to change ONE field, send ONLY that field. `{"name":""}` blanks the
name (and likely fails UNIQUE if another blank exists). Never send `""` unless you intend to clear.

---

## 4. DELETE /projects/:id

Delete a column. **CASCADE deletes every card in it.** Destructive and irreversible.

- **Request body:** none.
- **404** `{ "error": "not found" }` — `id` does not exist (nothing was deleted; existence is derived
  from whether the DELETE affected a row — there is no pre-check).
- **200** `{ "ok": true }` — column and all its cards removed.

```bash
curl -s -X DELETE "$API/projects/1"
# { "ok": true }
```

**WHY caution:** the FK is `ON DELETE CASCADE`, so deleting a column silently destroys all its cards.
There is no soft-delete and no undo. Confirm intent and consider `GET /projects` first to see what
you'll lose (check the column's `cards` length).

---

## 5. POST /projects/:id/cards

Add a card to the column `:id`. `position` is auto-set to `MAX(position)+1` within that project.

- **Request body:**

  | field    | required | type            | default    |
  |----------|----------|-----------------|------------|
  | `title`  | **yes**  | string, non-blank | —        |
  | `memo`   | no       | string          | `""`       |
  | `status` | no       | string          | `"active"` |

  `title` is validated with `title?.trim()` (present, not whitespace-only) and **stored trimmed**.
  `memo` and `status` use `||` fallback: omitted, `null`, or `""` → their defaults. `status` accepts
  any string; prefer `active|pending|done|blocked|archived` for UI compatibility.
- **400** `{ "error": "title required" }` — `title` missing, `null`, or blank. **Checked BEFORE the
  project lookup**, so a missing title beats a bad project id to 400.
- **404** `{ "error": "project not found" }` — the project `:id` does not exist.
- **200** — the created card object (with `id`, `project_id = :id`, `position`, `created_at`,
  `updated_at`).

```bash
curl -s -X POST "$API/projects/2/cards" -H 'Content-Type: application/json' \
  -d '{"title":"Write migration","memo":"blocked on review","status":"pending"}'

# minimal: title only (memo="", status="active")
curl -s -X POST "$API/projects/2/cards" -H 'Content-Type: application/json' \
  -d '{"title":"Triage inbox"}'
```

```json
{ "id": 43, "project_id": 2, "title": "Write migration", "memo": "blocked on review",
  "status": "pending", "position": 2, "created_at": "...", "updated_at": "..." }
```

---

## 6. PUT /cards/:id

Update a card's `title`, `memo`, `status`, and/or `project_id`. **Partial update** via `??`. Refreshes
`updated_at` to now. This is also the only way to change status or move a card between columns.

- **Request body:**

  | field        | required | type   | behavior                                          |
  |--------------|----------|--------|---------------------------------------------------|
  | `title`      | no       | string | `title ?? old`                                    |
  | `memo`       | no       | string | `memo ?? old`                                      |
  | `status`     | no       | string | `status ?? old`                                    |
  | `project_id` | no       | int    | `project_id ?? old` — **moves the card to that project** |

  Uses `??` for every field: omitted/`null` keeps old, any other value (including `""`) overwrites.
  `title` is **not** re-validated or re-trimmed, so `"title":""` produces an empty title (and
  `"title":null` keeps the old one).
- **No reorder:** `position` is not a writable field here.
- **404** `{ "error": "not found" }` — card `id` does not exist.
- **200** — the updated card object.

```bash
# mark done (only status changes; updated_at refreshes)
curl -s -X PUT "$API/cards/5" -H 'Content-Type: application/json' \
  -d '{"status":"done"}'

# mark blocked + add a memo
curl -s -X PUT "$API/cards/5" -H 'Content-Type: application/json' \
  -d '{"status":"blocked","memo":"waiting on infra"}'

# clear the memo on purpose ("" overwrites)
curl -s -X PUT "$API/cards/5" -H 'Content-Type: application/json' \
  -d '{"memo":""}'

# move card 5 to column 3 (verify 3 exists first!)
curl -s -X PUT "$API/cards/5" -H 'Content-Type: application/json' \
  -d '{"project_id":3}'
```

**WHY moving is risky:** there is **no validation that the target `project_id` exists**. A wrong id
succeeds (200) and orphans the card — it belongs to a non-existent column and won't appear under any
column in `GET /projects`. Resolve the target id with `GET /projects` before moving.

---

## 7. DELETE /cards/:id

Delete a single card.

- **Request body:** none.
- **404** `{ "error": "not found" }` — `id` does not exist (nothing was deleted).
- **200** `{ "ok": true }` — card removed. Irreversible, but affects only this one card.

```bash
curl -s -X DELETE "$API/cards/5"
# { "ok": true }
```

---

## Hard limits — what the API cannot do

- **No reorder endpoint.** `position` is assigned only on insert (`MAX+1`) and there is no endpoint to
  change it. The web UI stores visual order in browser `localStorage`; it is not representable or
  queryable via the API. Do not attempt to reorder columns or cards over HTTP.
- **No per-item read.** `GET /projects` returns the entire board; there is no `GET /projects/:id` or
  `GET /cards/:id`. Find items by searching the returned tree.
- **No lookup by name.** To find any id, `GET /projects` and search. Project `name` is UNIQUE; card
  `title` is NOT — a title may match multiple cards, so disambiguate by `id`/`project_id`.
- **No batch / transaction.** One mutation per request.
- **No move validation.** `PUT /cards/:id` with a bad `project_id` silently orphans the card.
- **Cascade delete.** Deleting a project deletes all its cards, irreversibly.

## Error summary

| Endpoint              | Code | Body                              | Cause                          |
|-----------------------|------|-----------------------------------|--------------------------------|
| POST /projects        | 400  | `{"error":"name required"}`       | blank/missing name             |
| POST /projects        | 400  | `{"error":"<sqlite msg>"}`        | duplicate name / DB error      |
| PUT /projects/:id     | 404  | `{"error":"not found"}`           | unknown id                     |
| PUT /projects/:id     | 400  | `{"error":"<sqlite msg>"}`        | rename collision / DB error    |
| DELETE /projects/:id  | 404  | `{"error":"not found"}`           | unknown id                     |
| POST .../cards        | 400  | `{"error":"title required"}`      | blank/missing title            |
| POST .../cards        | 404  | `{"error":"project not found"}`   | unknown project id             |
| PUT /cards/:id        | 404  | `{"error":"not found"}`           | unknown card id                |
| DELETE /cards/:id     | 404  | `{"error":"not found"}`           | unknown card id                |

All successful mutations return either the affected object (create/update) or `{"ok":true}` (delete)
with HTTP **200** — note that even creates return 200, not 201.
