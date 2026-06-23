#!/usr/bin/env bash
# PostToolUse(Edit|Write) hook: syntax-check src/index.js right after it's edited.
# Project has no test suite or linter, so this is the cheapest safety net.
# Exit 2 surfaces node's SyntaxError on stderr and feeds it back to Claude.
j=$(cat)
f=$(printf '%s' "$j" | jq -r '.tool_input.file_path // empty')
case "$f" in
  */src/index.js) node --check "$f" || exit 2 ;;
esac
