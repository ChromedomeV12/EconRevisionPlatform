# Repository Security Controls

## Verified Remote Settings

The repository owner verified these settings on 2026-10-12:

- GitHub private vulnerability reporting is enabled.
- Secret scanning and push protection are enabled.
- Dependabot alerts are enabled.
- Actions defaults to read-only workflow token permissions and cannot approve pull request reviews.

These are GitHub settings, not controls provided by the frontend. Recheck them after repository permission or hosting changes. Report vulnerabilities using the private reporting link in [SECURITY.md](../SECURITY.md).

## Verification Workflow

`.github/workflows/verify.yml` exposes the stable job/status name `verify` on pull requests, pushes to `main`, and manual runs. It uses Node.js 24 with no package installation or automatic package-manager caching, runs `node --test tests/*.test.cjs`, checks tracked JavaScript syntax, and performs a public packaging smoke check. Actions are pinned to immutable commits verified against the official `actions/checkout` v7.0.1 and `actions/setup-node` v7.1.0 tag references on 2026-10-12.

The workflow has `contents: read`, disables checkout credential persistence, and uses `pull_request`, not `pull_request_target`. Its `adaptive-browser` job installs pinned Playwright tooling outside the app, runs adaptive state/layout, feed-control and six-view layout-proportion checks, and publishes their screenshots as an Actions artifact. Both `verify` and `adaptive-browser` are required before merging; neither deploys the site. Private OCR tests and environments remain outside this public workflow. Other browser suites remain local checks documented in [Testing](TESTING.md).

The packaging check rejects tracked private/local directories, environment files other than `.env.example`, and symbolic links; requires core runtime files to be tracked; checks runtime text for private source/runtime paths; and builds a temporary copy of root HTML/CSS/JavaScript plus `assets/`, `vendor/`, and `.nojekyll`. It is a smoke check, not a secret scanner, license audit, content provenance check, or replacement for reviewing the actual Pages publication input. Documentation and other committed paths can also be exposed by branch-root Pages publishing.

## Main Branch Ruleset

The active [Protect main ruleset](https://github.com/ChromedomeV12/EconRevisionPlatform/rules/24907180) has ID `24907180`. It was created on 2026-10-12 after the first GitHub Actions `verify` run passed. Its payload is maintained in `.github/rulesets/main.json`; changing that file alone does not update GitHub.

The protection requires a pull request, the GitHub Actions `verify` and `adaptive-browser` checks on an up-to-date branch, resolved review threads, and linear history. It blocks force pushes and branch deletion and has no bypass actors. Zero mandatory approvals allows the solo owner to merge a checked PR; it does not constitute independent review. Extra approval for unattributed changes is disabled so it does not unexpectedly require another reviewer. Both required statuses are restricted to GitHub Actions integration ID `15368`; layout failures must block merging even when unit tests pass.

After reviewing any configuration change, an administrator can apply it with:

```sh
gh api --method PUT repos/ChromedomeV12/EconRevisionPlatform/rulesets/24907180 --input .github/rulesets/main.json
gh api repos/ChromedomeV12/EconRevisionPlatform/rulesets/24907180
gh api repos/ChromedomeV12/EconRevisionPlatform/rules/branches/main
```

Keep the remote response and committed intent consistent. Normal release work uses a feature branch and PR; do not disable the ruleset just to push directly. An administrator can repair a misconfigured check through repository settings after inspecting the configuration.

## Publishing and Review Boundaries

GitHub Pages currently publishes the `main` branch root. Branch-based Pages publishing is independent of this verification workflow, so a workflow failure alone does not stop deployment. The active ruleset requires both checks before merging. A future allowlisted Pages artifact workflow can provide a narrower publication boundary.

Before merging, review the diff for private reference material, credentials, new external requests, dependency changes, and rendering of untrusted strings. CI does not automatically enforce teacher review, textbook reuse rights, graph accuracy, or Jev backend authorization. Public diagrams and explanations need their own content/provenance review. Future shared submissions, accounts, or AI services require a backend security design before enabling those features.
