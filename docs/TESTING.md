# Testing Guide

Run commands from the project root. Public unit tests need Node, not the private corpus, Pi or a model server. CI uses Node 24. There is no `npm test` or app dependency install.

## Baseline

```sh
node --test tests/*.test.cjs
git diff --check
```

The `verify` workflow also syntax-checks tracked JavaScript and checks publication boundaries. It does not run the Playwright suites. Green CI is therefore not evidence that desktop/mobile visuals were inspected.

Graph-work tests include source-inventory mismatches, explicit dot/arrow policies, incomplete fidelity checklists, screenshot/path/hash tampering, changed renderer/style hashes, legacy snapshot compatibility and pending/stale recovery. Their inspection records and PNGs are synthetic fixtures, not proof of textbook fidelity; actual source/preview comparison remains a separate operator step.

## Select Checks by Risk

| Surface changed | Checks |
| --- | --- |
| Scheduling, persistence or decisions | `node --test tests/learning.test.cjs` |
| Exposure, revisit or confusing preferences | `node --test tests/refresh.test.cjs` |
| Native graph geometry/private queue | `node --test tests/graph.test.cjs tests/graph-work.test.cjs` |
| Card contract/private authoring/public projections | `node --test tests/card-model.test.cjs tests/card-work.test.cjs` and `node tests/card-content.cjs` |
| Textbook figures and copy | `node --test tests/diagram-data.test.cjs` |
| Preview assets or privacy boundary | `node --test tests/preview.test.cjs` |
| Feed, navigation or content layout | `node tests/browser.cjs` |
| Appearance, contrast or theme persistence | `node tests/theme.cjs` |
| Menu and modal behavior | `node tests/navigation.cjs` |
| Original images, enlargement or fallbacks | `node tests/diagrams.cjs` |
| Native SVG visuals | `node tests/graphs.cjs` |
| Private graph preview/app activation boundary | `node tests/graph-review.cjs` |

For broad UI changes, run every browser suite. For documentation-only work, check local links and commands against the actual files, then run the baseline; no screenshot claim is needed.

## Browser Tooling

Playwright is optional developer tooling, not an app runtime dependency. Point `PLAYWRIGHT_PATH` at an existing package directory and choose an installed browser. For the bundled Windows environment:

```powershell
$env:PLAYWRIGHT_PATH = "$env:USERPROFILE/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"
$env:BROWSER_CHANNEL = "msedge"
node tests/browser.cjs
node tests/theme.cjs
node tests/navigation.cjs
node tests/diagrams.cjs
node tests/graphs.cjs
node tests/graph-review.cjs
```

That package location is machine-specific. If it does not exist, select your own installation rather than copying the path unchanged. On Linux, environment assignments use shell syntax such as `export PLAYWRIGHT_PATH=/absolute/path/to/playwright`. Consult the graph guide for its private capture tool's additional browser executable option; not every browser test supports the same environment variables.

Browser suites create their own previews/fixtures; normally no manual server is needed first. Screenshots go to Git-ignored `test-output/`. Inspect them for complete axes/labels, unclipped text, readable captions, visible actions, appropriate contrast and coherent spacing. Check both themes and the small-screen cases, not only the widest screenshot.

## Private Tooling Checks

Only on a privately synced checkout, after reading the [OCR operations guide](OCR_OPERATIONS.md):

```sh
node tools/ocr/run.mjs test
node --test tests/ocr-vision.test.mjs
```

The optional `tests/pi-ocr.test.mjs` needs the actual Pi loader; setup is documented in the private tooling README. Do not run OCR setup, live inference or modify checkpoints merely to validate public documentation or frontend changes.

## Common Failures

- Missing Playwright/browser: configure an installed package and browser; do not report the suite as passed when it was skipped or could not launch.
- Dependency hash mismatch: inspect bytes and `.gitattributes`. D3's bundle and license require LF endings. Do not update pinned hashes just to hide checkout conversion or an unexplained dependency change.
- Missing public asset/404: check relative paths, exact filename case, Git tracking and `scripts/serve.cjs` allowlist. A local untracked file will not deploy.
- Storage appears empty: check the browser profile, origin and port. Export before intentionally clearing storage; there is no import UI.
- Browser process permission error: use an environment that permits launching the installed browser; preserve diagnostics and report the unrun coverage.

Record the commands actually run, their outcome and any missing coverage in the PR. Automated checks do not establish economic correctness, teacher approval or publication rights.
