---
name: proj-kanban-api
description: >-
  Read and mutate a proj-kanban kanban board over its REST API (curl/HTTP, not the web UI).
  USE THIS whenever the user wants to view or query the board, list/create/rename/recolor/delete
  a column (a column = a "project"), add a status-update card, edit a card's title/memo, change a
  card's status (mark something active/pending/done/blocked/archived), move a card to another
  column, delete a card, or find a project/card by name — and more generally whenever they mention
  the proj-kanban board, its columns/cards, or its API. Maps each task to the right one of the 7
  endpoints, builds correct JSON requests, resolves ids, and handles the validation/error cases and
  footguns. Trigger on "kanban", "board", "column", "status card", "mark X done/blocked", or
  "proj-kanban". Reach for this instead of guessing the API shape.
---

# proj-kanban REST API

A tiny Express + SQLite kanban board. The data model is two levels and slightly unusual:

- **project = a board column** — `{ id, name, color, position, created_at }`. `name` is UNIQUE.
- **card = a status update inside a column** — `{ id, project_id, title, memo, status, position, created_at, updated_at }`.

There are exactly **7 endpoints**, **no auth**, **no pagination**, **no batch**, and **one** read
endpoint (`GET /projects`) that returns the entire board as a nested tree. All bodies are JSON
(`Content-Type: application/json`).

This file is the operating guide. For the exhaustive per-endpoint contract — every status code,
exact request/response JSON, defaults, and copy-paste curl for all 7 — read **`references/api.md`**.

## Base URL & config

```
http://localhost:10023/proj-kanban/api
        └─ PORT ─┘     └─ BASE_PATH ┘
```

- Defaults: `PORT=10023`, `BASE_PATH=proj-kanban`. If a deployment overrides them, the URL changes:
  the API always lives at `/${BASE_PATH}/api`.
- **The API is ONLY reachable under the `BASE_PATH` subpath.** The router is mounted at
  `/${BASE_PATH}/api`; nothing is served at `/` or bare `/api`, so those return **404**. Always
  include the full subpath. If you get an unexpected 404 (or HTML instead of JSON), check this first.
- Set the base once and reuse it:

```bash
API="http://localhost:10023/proj-kanban/api"
```

## Getting a server

These calls need a running proj-kanban server. If none is up, start one:

```bash
git clone https://github.com/Lewsiafat/proj-kanban.git
cd proj-kanban && npm install && npm start
```

It serves at the default `http://localhost:10023/proj-kanban/api`. For a different host, `PORT`, or `BASE_PATH`, substitute it — the API always lives at `/${BASE_PATH}/api`.

## Task → endpoint decision guide

| You want to…                                  | Call                                       |
|-----------------------------------------------|--------------------------------------------|
| Read the whole board (all columns + cards)    | `GET /projects`                            |
| Find a project/card id by name/title          | `GET /projects`, then search the tree      |
| Create a column                               | `POST /projects`                           |
| Rename or recolor a column                    | `PUT /projects/:id`                        |
| Delete a column (**and all its cards**)       | `DELETE /projects/:id`                      |
| Add a status card to a column                 | `POST /projects/:id/cards`                 |
| Change a card's status / memo / title         | `PUT /cards/:id`                           |
| Mark a card done / blocked / etc.             | `PUT /cards/:id` with `{"status":"done"}`  |
| Move a card to another column                 | `PUT /cards/:id` with `{"project_id": N}`  |
| Delete a card                                 | `DELETE /cards/:id`                         |

There is **no per-project or per-card GET** — `GET /projects` is the only read. There is **no
reorder endpoint** (see Footguns).

## Resolve ids first (the cardinal pattern)

The API has no lookup-by-name, so every mutation needs a numeric id and almost every task is **two
steps**: `GET /projects`, search the tree, then mutate with the id you found.

```bash
# project id by (UNIQUE) name
curl -s "$API/projects" | jq '.[] | select(.name=="Backend") | .id'

# card id by title — titles are NOT unique, so this may return several;
# disambiguate by project_id/status/memo
curl -s "$API/projects" | jq '.[].cards[] | select(.title=="Deploy v2") | {id, project_id, status}'
```

## Common workflows

**Mark a card done** (status is a partial update — send only the field you change):
```bash
ID=$(curl -s "$API/projects" | jq '.[].cards[] | select(.title=="Deploy v2") | .id')
curl -s -X PUT "$API/cards/$ID" -H 'Content-Type: application/json' -d '{"status":"done"}'
```

**Add a card to the "In Progress" column:**
```bash
PID=$(curl -s "$API/projects" | jq '.[] | select(.name=="In Progress") | .id')
curl -s -X POST "$API/projects/$PID/cards" -H 'Content-Type: application/json' \
  -d '{"title":"Write migration","memo":"blocked on review","status":"pending"}'
```

**Create a column, then add a card in it:**
```bash
PID=$(curl -s -X POST "$API/projects" -H 'Content-Type: application/json' \
  -d '{"name":"Infra","color":"#10b981"}' | jq .id)
curl -s -X POST "$API/projects/$PID/cards" -H 'Content-Type: application/json' \
  -d '{"title":"Set up CI","status":"active"}'
```

**Move a card to another column** — set `project_id` (this is the move mechanism):
```bash
curl -s -X PUT "$API/cards/$CARD_ID" -H 'Content-Type: application/json' \
  -d "{\"project_id\": $TARGET_PID}"
```
The server does **not** verify the target column exists — confirm `$TARGET_PID` is real (via
`GET /projects`) first, or the card becomes orphaned (see Footguns).

## Status values

`status` is an **open string** at the API level — the DB stores whatever you send. But the web UI
only renders labels/colors for **`active` | `pending` | `done` | `blocked` | `archived`**. Stick to
that set; any other value saves fine but shows up unstyled/unlabeled in the UI. On create, an
omitted (or blank) status defaults to `active`.

## Footguns — read before mutating

- **Base-path subpath is load-bearing.** Requests outside `/${BASE_PATH}/api` return 404 because the
  router is mounted only there and nothing is served at root. Always include the subpath.
- **No reorder endpoint.** `position` is set only on insert (`MAX(position)+1`) and is never updatable
  via the API. The board's visual column/card order lives in the browser's `localStorage`, not the
  server — so the DB `position` does NOT reflect what the user sees. **Do not attempt to reorder over
  the API; it is impossible.** Don't promise the user a specific on-screen order.
- **`""` overwrites; omit/null preserves — but ONLY on PUT.** The two PUT endpoints update each field
  with `value ?? old`: an omitted field or explicit `null` keeps the old value, but an empty string
  `""` is a real value and **wipes** the field. To leave `memo` alone, omit it; send `"memo":""` only
  when you mean to clear it. (Note: POST is different — it uses `||`, so a blank `color`/`memo`/`status`
  on create falls back to the default. See references/api.md.)
- **PUT does not re-validate.** `PUT /projects/:id` and `PUT /cards/:id` do not re-check or re-trim
  `name`/`title`, so `{"name":""}` or `{"title":""}` will blank that field. Never send `""` for a
  required field unless you mean it.
- **Cascade delete is destructive and irreversible.** `DELETE /projects/:id` removes the column AND
  every card in it (`ON DELETE CASCADE`). There is no soft-delete and no undo. Confirm intent with the
  user first, especially for a non-empty column (check its `cards` length via `GET /projects`).
- **Moving a card isn't validated.** `PUT /cards/:id` with a bad `project_id` succeeds (200) and
  orphans the card — it belongs to a non-existent column and won't appear anywhere in `GET /projects`.
  Resolve the target id first.
- **Duplicate column names are rejected** (UNIQUE → 400, on both create and rename). The 400 body
  carries the raw SQLite message, not a friendly string. Card titles are NOT unique.

## Pre-flight checklist before any mutation

1. URL includes the full `/${BASE_PATH}/api` subpath.
2. `Content-Type: application/json` header is set; body is valid JSON.
3. Resolved the target id via `GET /projects` — don't guess ids.
4. For updates, send **only** the fields you mean to change (remember `""` overwrites on PUT).
5. For a card move, the destination `project_id` is confirmed to exist.
6. For `DELETE /projects/:id`, the user has confirmed — it cascades to all cards.

## Full contract

For every endpoint's exact request body, all status codes, response shapes, defaults, and
copy-pasteable curl, see **`references/api.md`**. Consult it whenever you're unsure of a field name,
default, or error shape.
