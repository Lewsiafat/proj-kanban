---
name: reset-db
description: 重建 proj-kanban 的 SQLite 資料庫。本專案沒有 migration，改動 src/index.js 裡的 CREATE TABLE schema 後，必須刪掉 DB 檔讓伺服器重新建立。此 skill 會先備份現有 kanban.db、刪除它，再提示重啟伺服器以觸發重建。Use when the user says "reset db", "重建資料庫", "重置資料庫", "recreate database", "重建 schema", or after editing the CREATE TABLE schema in src/index.js.
disable-model-invocation: true
---

# reset-db — 無 migration 的資料庫重建

proj-kanban 沒有 migration 機制：schema 由 `src/index.js` 啟動時用 `CREATE TABLE IF NOT EXISTS` 建立。**改了欄位定義後，既有的 DB 檔不會自動更新**——必須刪掉 DB 檔，下次啟動才會以新 schema 重建。

此操作會**清空所有看板資料**。務必先備份。

## 前置確認

執行前先向使用者確認：
1. 確定要重建嗎？這會清空現有所有 projects 與 cards。
2. 伺服器目前是否在跑？（要先停掉才能安全刪檔）

## 步驟

DB 檔位置：`${DATA_DIR}/kanban.db`，`DATA_DIR` 預設為專案根的 `./data`。若使用者有設 `DATA_DIR` 環境變數，以該路徑為準。

1. **停掉伺服器**（若在跑）。請使用者在跑伺服器的終端機按 Ctrl-C，或找到並停掉 `node src/index.js` 程序。不要在伺服器仍開著資料庫時刪檔。

2. **備份現有 DB**（帶時間戳，避免覆蓋舊備份）：
   ```bash
   cd <專案根>
   [ -f data/kanban.db ] && cp data/kanban.db "data/kanban.db.bak-$(date +%Y%m%d-%H%M%S)" && echo "已備份" || echo "沒有現有 DB，跳過備份"
   ```

3. **刪除 DB 檔**（含 SQLite 的 WAL/SHM 附屬檔，若有）：
   ```bash
   rm -f data/kanban.db data/kanban.db-wal data/kanban.db-shm
   ```

4. **重啟伺服器觸發重建**：
   ```bash
   npm start
   ```
   啟動時 `CREATE TABLE IF NOT EXISTS` 會以 `src/index.js` 當前的 schema 重新建立空資料表。

5. **驗證**：確認伺服器正常啟動（log 出現 `proj-kanban running on :<PORT>/<BASE_PATH>`），並用 API 確認資料表已建立、且為空：
   ```bash
   curl -s "http://localhost:${PORT:-10023}/${BASE_PATH:-proj-kanban}/api/projects"
   ```
   預期回傳 `[]`（空陣列）。

## 收尾

告知使用者：
- 備份檔名（可隨時用它還原：停伺服器 → `cp <備份檔> data/kanban.db` → 重啟）
- 資料已清空、schema 已套用新定義
- 確認的 schema 變更內容（若這次重建是為了某個欄位改動）
