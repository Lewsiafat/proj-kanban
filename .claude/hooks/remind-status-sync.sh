#!/usr/bin/env bash
# PostToolUse(Edit|Write) hook: when an edit to public/index.html touches the
# card-status UI, remind that status is an open string requiring three synced
# edits (documented footgun in CLAUDE.md). Stays silent otherwise.
j=$(cat)
f=$(printf '%s' "$j" | jq -r '.tool_input.file_path // empty')
case "$f" in
  */public/index.html)
    b=$(printf '%s' "$j" | jq -r '.tool_input.new_string // .tool_input.content // empty')
    printf '%s' "$b" | grep -qE 'status-|<option value=|labels' && \
      printf '%s' '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"提醒：card status 是 open string，新增或修改 status 需同步三處 — index.html 的 <select> 選項、cardHTML() 的 labels map、以及 .status-* CSS（見 CLAUDE.md）。"}}'
    ;;
esac
true
