---
name: release
description: >
  Release a new version of proj-kanban (this repo). Use when the user says "release",
  "發布", "發布新版本", "版本發布", "bump version", "tag and push". Bumps BOTH package.json
  and the plugin's plugin.json to the same version, updates the bilingual CHANGELOG, commits,
  tags, and pushes. Project-local — supersedes the generic global release skill here.
---

# Release Workflow (proj-kanban)

This repo ships an app **and** a Claude Code plugin from one version line. A release bumps both in
lockstep. This skill is tailored to this repo and overrides the generic global `release` skill.

## Procedure

1. **Check current state**
   - `git status` and `git diff --stat HEAD`
   - `git tag --sort=-v:refname | head -1` for the latest version

2. **Ask the user** (AskUserQuestion):
   - New version number (suggest major/minor/patch from the change type)
   - Any untracked files to include
   - Unclear changelog details

3. **Bump the version in BOTH files to the same value:**
   - `package.json` → `"version"`
   - `plugins/proj-kanban-api/.claude-plugin/plugin.json` → `"version"`
   These two MUST match. (`marketplace.json` carries no version — leave it.)

4. **Update the bilingual changelog** (both files, Keep a Changelog format, newest section on top):
   - `CHANGELOG.md`
   - `CHANGELOG.zh-TW.md`

   ```
   ## [X.Y.Z] - YYYY-MM-DD

   ### Added / Changed / Fixed / Removed
   - …
   ```

5. **Update docs if the release changed them:** `CLAUDE.md`, `README.md`, `README.zh-TW.md`.

6. **Commit.** Unlike the generic release skill, **DO stage `.claude/` and `plugins/`** — in this
   repo they are tracked and part of the product. Message (HEREDOC):

   ```
   chore(release): vX.Y.Z

   Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
   ```

7. **Merge back to main if on a feature branch:**
   ```bash
   git checkout main
   git merge <feature-branch> --no-ff -m "Merge '<feature-branch>' into main"
   ```
   Stop and ask if there are conflicts.

8. **Tag** (annotated, on main):
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z: <summary>"
   ```

9. **Push:**
   ```bash
   git push && git push --tags
   ```

10. **Report:** commit hash, tag, version (confirm `package.json` == `plugin.json`), changed files.

## Version guidelines

- **Major** (X.0.0): breaking REST API change (endpoint/contract removed or changed incompatibly).
- **Minor** (x.Y.0): new endpoint, new feature, new skill/plugin capability.
- **Patch** (x.y.Z): bug fix, doc-only, internal tweak.

## Invariant

After every release: `package.json` `version` === `plugins/proj-kanban-api/.claude-plugin/plugin.json`
`version` === the `vX.Y.Z` tag. If they ever diverge, the release is wrong.
