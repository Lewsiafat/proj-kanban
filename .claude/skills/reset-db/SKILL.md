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
