#!/usr/bin/env bash
# PostToolUse(Edit|Write) hook: when an edit to public/index.html touches the
# card-status UI, remind that status is an open string requiring three synced
# edits (documented footgun in CLAUDE.md). Stays silent otherwise.
j=$(cat)
f=$(printf '%s' "$j" | jq -r '.tool_input.file_path // empty')
case "$f" in
  */public/index.html)
    b=$(printf '%s' "$j" | jq -r '.tool_input.new_string // .tool_input.content // empty')
    printf '%s' "$b" | grep -qE 'STATUSES|statusLabel|status_|status-' && \
      printf '%s' '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"Reminder: card status is an open string. Adding or changing a status needs three synced edits — the STATUSES constant (key + emoji), a status_<key> entry in BOTH the en and zh-TW maps of the I18N dictionary, and the matching .status-* CSS classes (see CLAUDE.md)."}}'
    ;;
esac
true
