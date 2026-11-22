# Testing

Verification is risk-based. A check protects a specific property; passing it does not approve the economics, the design or the right to publish. Run commands from the project root. Public unit tests need Node 24, not the private corpus, Pi or a model server. There is no `npm test` or app dependency install.

## Baseline

```sh
node --test tests/*.test.cjs
git diff --check
```

CI runs the public unit suite, syntax checks and publication-boundary checks. The separate `adaptive-browser` job runs adaptive-state, adaptive-layout, feed-control and shared layout-proportion checks, and uploads screenshots. Other browser suites are local. Green CI is not evidence that a screenshot was inspected, and a green frontend `m1` run does not replace the cross-repository backend smoke test.

Use the normal checkout for frontend work. Run provider/backend checks from `../EconRevisionPlatform-m1` on frontend `m1`; from the backend repository, run `npm run smoke -- --frontend ../EconRevisionPlatform --content-frontend ../EconRevisionPlatform-m1`. Read [integration workflow](GIT_WORKFLOW.md#integration-branch) before updating `m1`.

## Choose checks by risk

| Changed surface | Check | Property protected |
| --- | --- | --- |
| Scheduling, persistence or decisions | `node --test tests/learning.test.cjs tests/refresh.test.cjs` | Reviews only from explicit ratings; browsing state is separate. |
| Card contract, authoring, public packs | `node --test tests/card-model.test.cjs tests/card-work.test.cjs` and `node tests/card-content.cjs` | Schema, provenance, immutable submissions, projection boundaries. |
| Native graph geometry/queue | `node --test tests/graph.test.cjs tests/graph-work.test.cjs` | Bounded geometry, fidelity gate, resumable drafts. |
| Textbook figures/copy | `node --test tests/diagram-data.test.cjs` | Image dimensions, attribution, figure/copy consistency. |
| Preview assets/privacy boundary | `node --test tests/preview.test.cjs` | Allowlist and private-source isolation. |
| Feed, navigation or content layout | `node tests/browser.cjs` | Feed behavior, preferences, rendering, responsive basics. |
| Shared page proportions/surfaces | `node tests/layout.cjs` | All six views, both themes, six widths, short-window and card/inset boundaries. |
| Appearance, contrast or theme persistence | `node tests/theme.cjs` | Palettes, contrast, persistence, reduced motion/transparency. |
| Menu and modal behavior | `node tests/navigation.cjs` | Focus, drawer, dialog headers, keyboard isolation. |
| Original images/enlargement | `node tests/diagrams.cjs` | Loading, contain fitting, zoom, fallback. |
| Native SVG visuals | `node tests/graphs.cjs` | Both themes, widths, labels and geometry. |
| Private graph review boundary | `node tests/graph-review.cjs` | Draft/reviewed activation and source isolation. |
| Adaptive presentation | `node --test tests/adaptive-layout.test.cjs` and `node tests/adaptive-layout.cjs`, `adaptive-state.cjs`, `feed-controls.cjs` | Geometry decisions, one DOM/state, focus and touch behavior. |
| Integrated OCR/graph/card recovery | `node --test tests/ocr-recovery.test.mjs` and `node tests/pi-ocr.test.mjs` | Durable budgets, pending work, Pi loader. Private sync needed. |

For broad UI work, run every browser suite. For documentation-only work, check links and commands against the files and run the baseline; no screenshot claim is needed.

## Browser tooling

Playwright is developer tooling, not an app dependency. Point `PLAYWRIGHT_PATH` at an installed package and choose a browser; `BROWSER_CHANNEL=msedge` uses installed Edge. A machine-specific bundled path may work on Windows, but do not copy it to another machine. On Linux, a temporary installation outside the app is fine:

```sh
npm install --prefix /tmp/econ-browser --no-audit --no-fund playwright@1.62.1
/tmp/econ-browser/node_modules/.bin/playwright install chromium
export PLAYWRIGHT_PATH=/tmp/econ-browser/node_modules/playwright
node tests/navigation.cjs
```

Browser suites create their own previews and fixtures. Screenshots go to Git-ignored `test-output/`. Inspect both themes, mobile widths and short windows, not only the widest capture. For layout work, check computed wrapper borders/backgrounds, card insets, wrapping, action rows and the actual six views; a passing interaction test cannot approve an unintended page frame.

Reload the document after CSS edits; hash-only navigation reuses loaded stylesheets. The layout guard and the documented [surface contract](ARCHITECTURE.md#surface-and-proportion-ownership) must both be satisfied. Physical keyboard/browser chrome and vibration still need a real-device spot check.

## Private checks

Only on a privately synced checkout, after reading [OCR operations](OCR_OPERATIONS.md):

```sh
node tools/ocr/run.mjs test
node --test tests/ocr-vision.test.mjs
```

The optional `tests/pi-ocr.test.mjs` needs the actual Pi loader. Do not run OCR setup, live inference or modify checkpoints merely to validate public documentation or frontend changes.

## What checks cannot prove

- Economic correctness, syllabus mapping or teacher approval.
- Reuse permission or the accuracy of a source attribution.
- That a graph matches the original; a hash-consistent render can still be visually wrong.
- That a screenshot was read, or that a design is acceptable.
- That a future backend enforces identity, authorization or audit.

State the commands run, their outcome and any unrun coverage in the PR.

## Common failures

- Missing Playwright/browser: configure it; do not report a skipped suite as passed.
- Dependency hash mismatch: inspect bytes and `.gitattributes`; D3 requires LF. Do not update hashes merely to hide checkout conversion.
- Missing public asset/404: check relative paths, case, Git tracking and the `scripts/serve.cjs` allowlist. An untracked local file will not deploy.
- Empty-looking storage: check browser profile, origin and port. Export before clearing; there is no import UI.
- Browser permission error: use an environment that permits launching the browser and report the unrun coverage.
