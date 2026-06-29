# proj-kanban-api(Claude Code plugin)

[English](./README.md) · **繁體中文**

一個 skill-only 的 Claude Code plugin,教 AI agent 透過 REST API 操作
[proj-kanban](https://github.com/Lewsiafat/proj-kanban) 看板 — 涵蓋 7 個端點、正確的
request body、id 解析,以及各種陷阱 — 讓 agent 不必猜測 API 形狀。

這個 plugin **只含 skill**,不包含看板伺服器。你要讓 agent 指向一個正在執行的 proj-kanban 伺服器。

## 安裝

```bash
/plugin marketplace add Lewsiafat/proj-kanban
/plugin install proj-kanban-api@proj-kanban
```

skill 會自動載入,當你提到看板、欄/卡片或其 API 時觸發。

## 怎麼生一台伺服器

skill 需要一個正在執行的 proj-kanban 伺服器(預設
`http://localhost:10023/proj-kanban/api`)。若手上沒有:

```bash
git clone https://github.com/Lewsiafat/proj-kanban.git
cd proj-kanban && npm install && npm start
```

若你的伺服器用不同的 host、`PORT` 或 `BASE_PATH`,請自行替換 — API 永遠位於 `/${BASE_PATH}/api`。

## 內容

- `skills/proj-kanban-api/SKILL.md` — 操作指南(task → 端點、workflow、陷阱)
- `skills/proj-kanban-api/references/api.md` — 完整逐端點合約

伺服器本身與完整專案請見
[proj-kanban repo](https://github.com/Lewsiafat/proj-kanban)。
