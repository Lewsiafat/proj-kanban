# proj-kanban-api (Claude Code plugin)

**English** · [繁體中文](./README.zh-TW.md)

A skill-only Claude Code plugin that teaches an AI agent to drive a
[proj-kanban](https://github.com/Lewsiafat/proj-kanban) board over its REST API — the 7
endpoints, correct request bodies, id resolution, and the footguns — so the agent doesn't guess
the API shape.

This plugin ships the **skill only**; it does not include the kanban server. You point the agent
at a running proj-kanban server.

## Install

```bash
/plugin marketplace add Lewsiafat/proj-kanban
/plugin install proj-kanban-api@proj-kanban
```

The skill auto-loads and triggers when you mention the kanban board, its columns/cards, or its API.

## Getting a server

The skill talks to a running proj-kanban server (default
`http://localhost:10023/proj-kanban/api`). If you don't have one:

```bash
git clone https://github.com/Lewsiafat/proj-kanban.git
cd proj-kanban && npm install && npm start
```

If your server uses a different host, `PORT`, or `BASE_PATH`, substitute it — the API always lives
at `/${BASE_PATH}/api`.

## What's inside

- `skills/proj-kanban-api/SKILL.md` — operating guide (task → endpoint, workflows, footguns)
- `skills/proj-kanban-api/references/api.md` — the full per-endpoint contract

For the server itself and the full project, see the
[proj-kanban repo](https://github.com/Lewsiafat/proj-kanban).
