# Repository security controls

## Current controls

The owner verified these GitHub settings on 2026-10-12:

- Private vulnerability reporting enabled.
- Secret scanning and push protection enabled.
- Dependabot alerts enabled.
- Actions default to read-only workflow tokens and cannot approve pull-request reviews.

These are repository settings, not frontend controls. Recheck them after changing repository permissions or hosting.

The active [Protect main ruleset](https://github.com/ChromedomeV12/EconRevisionPlatform/rules/24907180) has ID `24907180`. Its committed intent is `.github/rulesets/main.json`; editing that file does not update GitHub. The ruleset requires a pull request, the `verify` and `adaptive-browser` checks on an up-to-date branch, resolved review threads and linear history. It blocks force pushes and deletion and has no bypass actors.

Zero mandatory approvals lets the solo owner merge a checked PR. It is not independent review. Both required checks are restricted to the GitHub Actions integration, so a layout failure blocks merging even when unit tests pass.

## Verification workflow

`verify` runs on pull requests and pushes to `main`/`m1`. It uses Node 24, runs public unit tests, syntax-checks tracked JavaScript and performs a packaging smoke check. It has `contents: read`, does not persist checkout credentials and runs on `pull_request`, not `pull_request_target`.

`adaptive-browser` installs pinned Playwright tooling outside the app, runs adaptive state/layout, feed-control and six-view layout-proportion checks, and uploads screenshots. It does not deploy. Private OCR tests and environments stay outside the public workflow.

The packaging check rejects tracked private/local directories, environment files other than `.env.example`, and symlinks; requires core runtime files; checks runtime text for private paths; and builds a temporary copy of the public runtime. It is a smoke check, not a secret scanner, license audit, provenance check or replacement for reviewing the actual Pages input. Documentation and other committed paths can also be exposed by branch-root publishing.

## Publishing boundary

GitHub Pages publishes the `main` branch root. Branch-based publishing is independent of the verification workflow: a failed workflow alone does not stop a deployment, but the ruleset gates the merge. A future allowlisted Pages artifact workflow would provide a narrower publication boundary.

Before merging, inspect the diff for private material, credentials, new external requests, dependency changes and rendering of untrusted strings. CI cannot enforce teacher review, reuse rights, graph accuracy or future backend authorization. Public diagrams and explanations need their own content and provenance review.

## Maintenance

Apply an approved ruleset change as an administrator, then inspect the remote result:

```sh
gh api --method PUT repos/ChromedomeV12/EconRevisionPlatform/rulesets/24907180 --input .github/rulesets/main.json
gh api repos/ChromedomeV12/EconRevisionPlatform/rulesets/24907180
gh api repos/ChromedomeV12/EconRevisionPlatform/rules/branches/main
```

Keep the committed intent and remote response consistent. Normal releases use a feature branch and PR; do not disable the ruleset to push directly. Repair a misconfigured check through repository settings after inspecting it. See [Security policy](../SECURITY.md) and [Git workflow](GIT_WORKFLOW.md).
