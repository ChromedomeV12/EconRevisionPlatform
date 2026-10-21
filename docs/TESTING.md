# Testing Guide

Run commands from the project root. Public unit tests need Node, not the private corpus, Pi or a model server. CI uses Node 24. There is no `npm test` or app dependency install.

## Baseline

Run user-facing frontend checks from the normal checkout. Run backend-provider tests from `../EconRevisionPlatform-m1` on frontend `m1`; its public suite includes `tests/content-provider.test.cjs`. From the backend repository, run `npm run smoke -- --frontend ../EconRevisionPlatform --content-frontend ../EconRevisionPlatform-m1` to exercise both the demo's decision adapter and the integrated catalog provider. Keep backend and integration worktree paths outside the backend's ES-module package scope. See [integration workflow](GIT_WORKFLOW.md#integration-branch) before bringing frontend updates into `m1`.

```sh
node --test tests/*.test.cjs
git diff --check
```

The `verify` workflow runs for pull requests and pushes to frontend `main` and `m1`. It also syntax-checks tracked JavaScript and checks publication boundaries. The separate `adaptive-browser` job installs pinned Playwright tooling outside the application, runs adaptive-state, adaptive-layout, feed-controls and shared layout-proportion checks, and uploads screenshots as `adaptive-layout-screenshots` for 30 days. The other browser suites remain local checks. Green CI is not evidence that screenshots were visually inspected. A passing frontend `m1` run does not replace the cross-repository backend smoke check.

Graph-work tests include source-inventory mismatches, explicit dot/arrow policies, incomplete fidelity checklists, screenshot/path/hash tampering, changed renderer/style hashes, legacy snapshot compatibility and pending/stale recovery. Their inspection records and PNGs are synthetic fixtures, not proof of textbook fidelity; actual source/preview comparison remains a separate operator step.

## Select Checks by Risk

| Surface changed | Checks |
| --- | --- |
| Scheduling, persistence or decisions | `node --test tests/learning.test.cjs` |
| Exposure, revisit or confusing preferences | `node --test tests/refresh.test.cjs` |
| Native graph geometry/private queue | `node --test tests/graph.test.cjs tests/graph-work.test.cjs` |
| Card contract/private authoring/public projections | `node --test tests/card-model.test.cjs tests/card-work.test.cjs` and `node tests/card-content.cjs` |
| Opt-in HTTP catalog provider | `node --test tests/content-provider.test.cjs`: exact envelope, editorial status and release-hash verification, canonical graph hashes and geometry, malformed/tampered/ID-dropping rejection, the explicit static legacy fallback and reusable refresh; plus the companion backend repository's `--content-frontend` loopback smoke for real transport |
| Adaptive state synchronization | `node tests/adaptive-state.cjs`: both themes, phone-to-desktop preference selection, desktop-to-phone deselection, unchanged card DOM/recall history, initial/repeated feed entries updating exposure, resize/menu-collapse preserving exposure |
| Adaptive presentation | `node --test tests/adaptive-layout.test.cjs` and `node tests/adaptive-layout.cjs`: synchronous pre-app layout, exact ratio/width/short-screen boundaries, both themes, rotation/resizing, unchanged card DOM/filter/bookmarks/revisit/opened timestamps/recall history, hidden controls/focus and duplicate IDs |
| Swipe action menu and side dial | `node tests/feed-controls.cjs`: five compact/portrait widths/both themes, keyboard navigation, hold/drag/release, browser touch cancellation, active-card targeting, short-screen wrapping and unchanged recall history |
| Integrated OCR/graph/card interruption recovery | `node --test tests/ocr-recovery.test.mjs` and `node tests/pi-ocr.test.mjs` (privately synced tooling; actual Pi loader required) |
| Textbook figures and copy | `node --test tests/diagram-data.test.cjs` |
| Preview assets or privacy boundary | `node --test tests/preview.test.cjs` |
| Feed, navigation or content layout | `node tests/browser.cjs` |
| Shared page proportions and surface boundaries | `node tests/layout.cjs`: all six views in both themes at 360/390/768/1024/1280/1920px, plus a 1280×550 short-window case; transparent unframed wrappers, consistent unclipped inline Study settings placement, card insets, text wrapping, action rows, queue bounds and 44px graph zoom targets. Refresh checks aligned heading/canvas/queue/control edges, the same desktop top-bar gap as Dashboard, a native point fitting without inner scrolling at 1280×900, and full-viewport swipe mode. Screenshots go to `test-output/layout/`. |
| Appearance, contrast or theme persistence | `node tests/theme.cjs`: both themes and all six views, composited small-text/SVG-label contrast, unchanged feed geometry and saved state, OS/cross-tab preferences, storage fallback and reduced motion/transparency |
| Menu and modal behavior | `node tests/navigation.cjs`: pre-paint desktop preference, temporary narrow/welcome drawers, focus containment/restoration, backdrop scroll isolation, route and settings handoff, skip-link route preservation, viewport transitions, modal feed-keyboard isolation and fixed dialog headers |
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

A Linux installation matching CI can live entirely outside the app:

```sh
npm install --prefix /tmp/econ-browser --no-audit --no-fund playwright@1.62.1
/tmp/econ-browser/node_modules/.bin/playwright install chromium
export PLAYWRIGHT_PATH=/tmp/econ-browser/node_modules/playwright
node tests/navigation.cjs
node tests/theme.cjs
```

Browser suites create their own previews/fixtures; normally no manual server is needed first. Screenshots go to Git-ignored `test-output/`. Inspect them for complete axes/labels, unclipped text, readable captions, visible actions, appropriate contrast and coherent spacing. Check both themes and the small-screen cases, not only the widest screenshot.

For a redesign, also inspect the actual welcome, dashboard, feed, library, saved-card and studio surfaces, not only test screenshots. Check that real activity is easy to find, the introduction does not replace feed-first entry, every route remains reachable at intermediate widths, and short portrait/landscape windows keep the study controls available without scrolling the outer page. Exercise drawer dismissal and keyboard focus; ensure navigating a menu does not advance the background feed or record exposure. Evaluate type hierarchy, text contrast and diagram readability in both themes, including a 320px-wide layout and enlarged browsing.

Reload the document after CSS edits: hash-only navigation reuses the loaded stylesheets. For shared surface changes, use `node tests/layout.cjs` and compare each view with [surface and proportion ownership](ARCHITECTURE.md#surface-and-proportion-ownership), not just with another screenshot of the same build. Check the effective computed styles, card insets, wrapping and action alignment; distinguish legitimate keyboard-focus outlines from persistent page-wide card frames. PR #12 (`95f0914`) corrected a shared-selector specificity regression that passed the earlier interaction/contrast suites. The layout guard and visual contract must both be satisfied before approval.

## Adaptive Layout Review

Run `node tests/adaptive-state.cjs`, `node tests/adaptive-layout.cjs`, `node tests/feed-controls.cjs` and the other browser suites for layout changes. Inspect `test-output/adaptive/desktop-{light,dark}.png` and `phone-{light,dark}.png`; the CI artifact contains these and action-menu/dial/short-screen captures. Screenshots stay Git-ignored and out of the Pages publication source. Link the Actions artifact in the PR.

The adaptive suite blocks `app.js` during initial-load checks to verify the geometry attribute and workspace chrome before deferred application rendering. It tests both sides of the 600px, 1000px, 1.2 ratio and 500px height decisions, preserving a non-first saved/revisit card with a nonempty recall log across switches. Coarse-pointer height-only browser chrome is simulated independently of orientation (Playwright viewport resizing can generate orientation events); Node VM coverage also simulates an editable keyboard and a fine-pointer height resize. Touch dispatch in `feed-controls.cjs` checks hold/drag/release, cancellation and optional haptics including unavailable/throwing APIs and reduced motion. Physical keyboard/browser chrome and vibration still warrant a real-device spot check; emulation does not establish hardware behavior.

The graph-review integration fixture intercepts the final content adapter so modular editorial packs cannot replace its deliberately isolated draft/reviewed test card.

## Private Tooling Checks

Only on a privately synced checkout, after reading the [OCR operations guide](OCR_OPERATIONS.md):

```sh
node tools/ocr/run.mjs test
node --test tests/ocr-vision.test.mjs
```

The optional `tests/pi-ocr.test.mjs` needs the actual Pi loader; setup is documented in the private tooling README. Do not run OCR setup, live inference or modify checkpoints merely to validate public documentation or frontend changes.

## M1 Catalog Provider Verification

`node --test tests/content-provider.test.cjs` covers the optional HTTP catalog provider with no running backend: exact catalog envelope, editorial status and release-hash verification, canonical SHA-256 graph checks and geometry validation, rejection of malformed, tampered, and ID-dropping releases, the explicit static legacy fallback, and repeated `listPacks()` and refresh calls through one reusable provider without resetting local state.

The real-transport proof runs from the companion backend repository, not from this app:

```sh
# from ../EconRevisionPlatform-backend
npm run smoke -- --content-frontend ../EconRevisionPlatform-m1-publish
```

This drives this worktree's `content-bootstrap.js` through `EconCatalog.createHttpProvider` against an in-process loopback backend, performing the full `EconCatalog.refresh` (catalog fetch, exact-revision graph fetches, WebCrypto hash verification, geometry validation) and asserting the 13 canonical plus 9 legacy-fallback cards. It is local loopback verification only: it does not imply deployment, authentication, or any shared or authoring service.

A local verification of the merged worktree (2026-10-18) ran the full public suite (136 unit tests and all ten Playwright suites, including the six-view layout and theme captures), then refreshed a running preview twice against a real loopback backend: both refreshes retained the 13 canonical plus 9 legacy cards with all four stored state keys byte-identical, and a tampered graph release was rejected with the previous DOM, catalog, and state intact. No remote CI or push claim is made by that run.

## Common Failures

- Missing Playwright/browser: configure an installed package and browser; do not report the suite as passed when it was skipped or could not launch.
- Dependency hash mismatch: inspect bytes and `.gitattributes`. D3's bundle and license require LF endings. Do not update pinned hashes just to hide checkout conversion or an unexplained dependency change.
- Missing public asset/404: check relative paths, exact filename case, Git tracking and `scripts/serve.cjs` allowlist. A local untracked file will not deploy.
- Storage appears empty: check the browser profile, origin and port. Export before intentionally clearing storage; there is no import UI.
- Browser process permission error: use an environment that permits launching the installed browser; preserve diagnostics and report the unrun coverage.

Record the commands actually run, their outcome and any missing coverage in the PR. Automated checks do not establish economic correctness, teacher approval or publication rights.
