# Git, review and deployment

## Model

`main` is the deployable demo and is protected. Changes arrive through a feature branch and a pull request. Required `verify` and `adaptive-browser` checks, resolved review threads and linear history gate the merge. Direct pushes, force pushes and branch deletion are blocked. The solo owner may merge their own checked PR; that is not independent review.

A feature-branch push does not deploy. Merging to `main` starts GitHub Pages. GitHub Pages publishes the `main` root; the local preview's allowlist is a separate protection.

## Authentication

Run `gh auth login` and `gh auth setup-git` once per machine. Use the browser login; credentials stay in GitHub CLI, not in the repository.

## Normal change

```sh
git status --short --branch
git switch main
git pull --ff-only origin main
git switch -c codex/my-change
```

Edit, run the risk-appropriate checks in [Testing](TESTING.md), then stage explicit public files:

```sh
git add index.html styles.css app.js
git diff --cached --stat
git diff --cached
git commit -m "Describe the user-visible change"
git push -u origin codex/my-change
gh pr create --base main --head codex/my-change --title "..." --body "..."
```

Stage explicit paths, not `git add .`. The workspace contains private sources, Pi settings, OCR runtimes and generated screenshots. Use `.gitignore` as accident prevention, not as authorization or HTTP access control.

## Merge and verify

```sh
gh pr checks 123 --watch --interval 10
gh pr view 123 --json headRefOid --jq .headRefOid
gh pr merge 123 --squash --delete-branch --match-head-commit FULL_REVIEWED_HEAD_SHA
git switch main
git pull --ff-only origin main
git rev-parse HEAD
gh run list --branch main --limit 5
```

Use the full reviewed head SHA. If the head changed, inspect the new commits and rerun the relevant checks rather than bypassing the protection. After merge, find the `pages build and deployment` run for the merged commit:

```sh
gh run view RUN_ID
gh run watch RUN_ID --exit-status --interval 10
gh api repos/ChromedomeV12/EconRevisionPlatform/pages/builds/latest
```

Confirm the run succeeded and the latest Pages build is `built`, without error, for the merged `main` SHA. An older successful deployment is not enough. If it fails, inspect `gh run view RUN_ID --log-failed`.

## Reviewing a pull request

Read the proposal and diff, then test the actual behavior:

```sh
gh pr view 123
gh pr diff 123
gh pr checks 123
```

A useful finding names the file/line, the action that triggers the issue, the incorrect result and the expected result. Check keyboard/touch behavior, responsive layout, state persistence, private-file inclusion and the risk-appropriate suites. Submit one review: approve, request changes, or comment. Return to your branch afterward.

## Integration Branch

Keep frontend `main` demo-ready. Use `../EconRevisionPlatform-m1` on the long-lived `m1` branch to test the backend with current frontend UI. Create it as a Git worktree, not a second clone:

```sh
git fetch origin
git worktree add --track -b m1 ../EconRevisionPlatform-m1 origin/m1
```

If local `m1` exists without an attached worktree, use `git worktree add ../EconRevisionPlatform-m1 m1`. Stop if the destination contains files or the branch is checked out elsewhere. Keep the worktree directory and its `.git` metadata out of folder sync. After moving machines or changing OS, run `git worktree repair <path>`; never copy `.git` worktree pointer files between machines. See [repositories and working copies](ARCHITECTURE.md#repositories-and-working-copies).

With a clean integration tree:

```sh
git fetch origin
git merge origin/main
node --test tests/*.test.cjs
```

Resolve conflicts by preserving the UI change and backend adapters; inspect each hunk. Do not reset `m1` to `main` or replace whole files to suppress conflicts. From the backend repository, run the cross-repository smoke:

```sh
npm run smoke -- --frontend ../EconRevisionPlatform --content-frontend ../EconRevisionPlatform-m1
```

Push `m1` after validation and record which frontend and backend commits were tested. A merge to `m1` does not deploy Pages. Promote reviewed integration changes to `main` through a PR when deployment needs them. Retire `m1` only by owner decision.

## Branch cleanup

```sh
git fetch origin --prune
git branch -avv
git ls-remote --heads origin
```

Keep branches with unique or unreviewed work. A squash merge may fail the ancestry check even when the content is integrated; verify the merged PR and resulting content before deleting a local branch. Never delete `main` or use cleanup as an excuse to discard working files.
