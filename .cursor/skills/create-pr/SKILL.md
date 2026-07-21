---
name: create-pr
description: >-
  Create a GitHub pull request following team workflow. Use when opening a PR
  or preparing a branch for review after implementing a story.
disable-model-invocation: true
---

# Create Pull Request

Create a GitHub PR for the current branch using `gh`.

Prefer running `/compose-tests` first when the branch implements tracker stories, so the PR **Test plan** can list new `docs/mobile-app-test-pack.md` cases (and any story `verify.command` from implement-story).

## Process

Run these commands in parallel first:

```bash
git status
git diff
git log --oneline -10
```

Also check branch tracking:

```bash
git status -sb
```

Then review **all commits** on this branch since it diverged from the base branch (usually `main`):

```bash
git log main...HEAD --oneline
git diff main...HEAD
```

## PR body

Draft a summary covering every commit on the branch, not just the latest one.

```markdown
## Summary
- <1-3 bullet points of what changed and why>

## Test plan
- [ ] <how to verify the changes>
```

Reference story IDs when the PR implements tracker tickets (e.g. STORY-2.1).

## Create

1. Push if needed (only when explicitly asked or when creating the PR requires it):

```bash
git push -u origin HEAD
```

2. Create the PR:

```bash
gh pr create --title "the pr title" --body "$(cat <<'EOF'
## Summary
...

## Test plan
- [ ] ...

EOF
)"
```

## Rules

- Never update git config.
- Never force-push to `main`/`master`.
- Return the PR URL when done.
- Use conventional commit style for the PR title when it maps to a single change type (e.g. `feat(story-2.1): add login flow`).
