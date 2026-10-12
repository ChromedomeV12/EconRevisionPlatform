# Git, Deployment and Pull Requests

Run these commands from the EconRevisionPlatform project root. Git and the GitHub CLI (`gh`) must be installed. The Git commands work in PowerShell and Linux shells; replace example branch names, messages, PR numbers and run IDs with your own.

## What Each Step Does

- `git add` selects the files for the next commit, including new files.
- `git commit` records those selected changes locally.
- `git push` sends local commits to GitHub.
- GitHub Pages automatically builds and publishes commits pushed or merged to `main` in this repository.
- A pull request proposes merging a branch into `main`, with a place to discuss and review the changes first.

This repository is `ChromedomeV12/EconRevisionPlatform`. Pages uses **Deploy from a branch**, branch **main**, folder **/ (root)**. There is no application build step and no separate deploy CLI command. `.nojekyll` is committed for static-file hosting.

Live site: <https://chromedomev12.github.io/EconRevisionPlatform/>.

## One-Time Authentication

```sh
gh auth login
gh auth setup-git
gh auth status
```

Use the interactive browser login. Authentication is stored by GitHub CLI, not in the repository.

## Commit and Propose a Deployment

The protected default branch uses pull requests and the required `verify` check. Direct pushes to `main` are blocked. The policy is recorded in `.github/rulesets/main.json`; editing that file alone does not update GitHub's live ruleset. See `REPOSITORY_SECURITY.md` for the settings and maintenance commands.

Before starting edits, update your branch. Commit or otherwise preserve any existing tracked work before switching branches or pulling.

```sh
git status --short --branch
git switch main
git pull --ff-only origin main
git switch -c codex/my-change
```

Make the changes and check them locally. Opening `index.html` works, or run the loopback-only preview below and stop it with Ctrl+C when finished:

```sh
node scripts/serve.cjs 4181
```

Open <http://127.0.0.1:4181>. Then run the checks:

```sh
node --test tests/learning.test.cjs tests/refresh.test.cjs
node tests/browser.cjs
node tests/theme.cjs
git diff --check
git status --short
git diff
```

The browser check needs Playwright. You can point `PLAYWRIGHT_PATH` at an existing package and set `BROWSER_CHANNEL=msedge` to use installed Edge. On this Windows machine, the bundled package can be selected in PowerShell:

```powershell
$env:PLAYWRIGHT_PATH = "$env:USERPROFILE/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"
$env:BROWSER_CHANNEL = "msedge"
node tests/browser.cjs
```

Stage the exact public files you changed. For example:

```sh
git add index.html styles.css acrylic.css app.js scripts/serve.cjs tests/browser.cjs
git diff --cached --stat
git diff --cached
git commit -m "Refine the acrylic refresh interface"
git push -u origin codex/my-change
gh pr create --base main --head codex/my-change --title "Refine the acrylic refresh interface" --body "Explain the change and how it was tested."
```

`git diff` shows unstaged edits; `git diff --cached` shows what the commit will contain. New files appear as `??` in `git status` and are not included by `git commit -am`. Remember to add new stylesheets, scripts, fonts or images and update the preview server's public allowlist when needed. Stage changed documentation explicitly too.

The local checkout also contains private references and OCR tooling. Use explicit public-file staging instead of `git add .`. Keep `private-sources/`, `.pi/`, `.ocr-runtime/`, credentials and generated screenshots out of commits. Local OCR tooling is maintained separately from this public app release.

After CI passes, inspect the PR diff and merge with `gh pr merge PR_NUMBER --squash --delete-branch`. A feature-branch push does not deploy the public app; merging to `main` does. If the branch falls behind `main`, bring in the current base and rerun checks. Do not force-push to `main`.

## Verify the Deployment

Merging to `main` starts deployment automatically. Switch back to `main`, pull the merged commit, and locate the Pages run for it:

```sh
git switch main
git pull --ff-only origin main
git rev-parse HEAD
gh run list --branch main --limit 5
```

Find **pages build and deployment**, then substitute its numeric ID for `RUN_ID`:

```sh
gh run view RUN_ID
gh run watch RUN_ID --exit-status --interval 10
gh api repos/ChromedomeV12/EconRevisionPlatform/pages/builds/latest
```

Confirm the run succeeded and its commit matches the commit you pushed. A successful push alone does not establish that deployment finished. If the run fails:

```sh
gh run view RUN_ID --log-failed
```

Open the live site and hard-refresh with Ctrl+F5 if it still looks old. Check the feed, navigation, typography and diagrams. The browser's Network panel should show `acrylic.css` and other required assets loading successfully. A `?v=COMMIT_SHA` suffix can help test a fresh document request; a hard refresh also refreshes linked assets.

The configuration is visible at **Repository -> Settings -> Pages**. Run history is under **Actions**. GitHub documents the [branch publishing setup](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Open a Pull Request

Use a branch when you want review before deployment. Start before making your edits:

```sh
git switch main
git pull --ff-only origin main
git switch -c codex/my-change
```

Edit, test, then stage the relevant files and publish the branch:

```sh
git add index.html acrylic.css app.js
git diff --cached
git commit -m "Describe the improvement"
git push -u origin codex/my-change
gh pr create --base main --head codex/my-change --title "Describe the improvement" --body "Explain the change and how it was tested."
```

Use `--draft` on `gh pr create` for unfinished work, or `gh pr create --web` to write the description in GitHub. For a longer description saved in a file, use `--body-file path/to/description.md`. Subsequent commits pushed to the same branch automatically update the PR. See the [PR creation reference](https://cli.github.com/manual/gh_pr_create).

A feature-branch push does not update this site's Pages deployment. Once the PR is reviewed and ready, replace `123` with its number:

```sh
gh pr checks 123
gh pr merge 123 --squash --delete-branch
git switch main
git pull --ff-only origin main
```

Merging updates `main` and starts Pages deployment. The `verify` workflow must pass and review conversations must be resolved. There is currently no mandatory second-person approval because this is a solo-maintained repository; approval and merging remain separate actions. Run browser tests locally as well as checking CI.

## Review Someone Else's Pull Request

Start by reading the proposal and diff:

```sh
gh pr list --state open
gh pr view 123
gh pr diff 123
gh pr checks 123
gh pr view 123 --web
```

On GitHub, open **Files changed**, click a line's **+** to leave a comment, then use **Review changes** to submit the review. A useful finding names the file/line, the action that triggers the issue, the incorrect result, and the expected result.

For local testing, preserve your current work first. Read the changed code and scripts before executing them:

```sh
gh pr checkout 123
node --test tests/learning.test.cjs tests/refresh.test.cjs
node tests/browser.cjs
```

Check the requested behavior, regressions, mobile layout, keyboard access, state persistence and whether private files were accidentally included. Then submit **one** appropriate review:

```sh
gh pr review 123 --approve --body "Checked the diff and verified desktop/mobile behavior. Tests pass."
```

Or request fixes for a concrete issue:

```sh
gh pr review 123 --request-changes --body "At 360px width the bottom controls overlap navigation. Please fix the layout before merging."
```

Or leave non-blocking feedback:

```sh
gh pr review 123 --comment --body "Consider making the empty-state label more specific."
```

Write what you actually verified; these review messages are examples. Return to your branch afterward with `git switch main` (or your previous branch). The CLI supports [checking out a PR](https://cli.github.com/manual/gh_pr_checkout) and [submitting reviews](https://cli.github.com/manual/gh_pr_review).
