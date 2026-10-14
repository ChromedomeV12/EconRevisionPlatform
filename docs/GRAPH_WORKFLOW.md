# Native Graphs and Local Reconstruction

## Architecture Decision

Use **D3 7.9.0 and browser-native SVG**, with a small declarative economics layer in `graph.js`. The app stays static, vanilla JavaScript and build-free. D3 is vendored, with its ISC licence and pinned hashes checked in tests. No CDN or model is called at runtime.

D3's [linear scales](https://d3js.org/d3-scale/linear) preserve proportional differences and map domain coordinates to SVG positions. [JSXGraph](https://jsxgraph.org/docs/) is a viable alternative for interactive geometry and function plotting, but those capabilities are not needed for the current fixed revision diagrams. This choice does not make D3 an economics reasoning engine: we validate relationships ourselves and still require visual and content review.

`graph.css` maps semantic diagram roles to colors, separately from geometry. Change `--graph-demand`, `--graph-supply`, `--graph-cost`, `--graph-guide`, `--graph-arrow`, `--graph-welfare`, `--graph-ink` and `--graph-paper` there. Latte and dark-mode diagram accents remain readable on light paper. Theme changes apply directly through CSS; diagrams do not need rebuilding. Typography uses the existing DM Sans font when available.

## Agent Contract

The agent writes JSON, not SVG, JavaScript, arbitrary CSS or evaluated formula strings. `EconGraphs.validate(spec)` returns `{ valid, errors }`; `EconGraphs.render(spec, document)` creates an accessible SVG using D3 scales. CommonJS exports support local tooling and unit tests.

All top-level fields are required:

```json
{
  "version": 1,
  "id": "synthetic-demand",
  "title": "Synthetic demand example",
  "description": "Illustrative positions, not textbook measurements.",
  "coordinateMode": "schematic",
  "axes": {
    "x": { "label": "Quantity", "min": 0, "max": 10 },
    "y": { "label": "Price", "min": 0, "max": 10 }
  },
  "curves": [{ "id": "demand-line", "label": "Demand", "role": "demand", "points": [[1, 9], [9, 1]] }],
  "points": [{ "id": "first", "label": "", "curve": "demand-line", "x": 3, "y": 7, "xLabel": "Q1", "yLabel": "P1" }],
  "guides": [{ "point": "first", "axes": ["x", "y"] }],
  "arrows": [],
  "areas": [],
  "labels": [],
  "review": { "status": "draft", "reviewer": null }
}
```

- Curves are piecewise-linear vertices in data coordinates. Supported roles are `demand`, `supply`, `cost` and `reference`. No spline smoothing is applied. Vertical/horizontal special cases can use `reference` with an explicit label; do not mislabel them merely to evade slope checks.
- Optional curve `shape:"linear"` requires every vertex to lie on the straight segment between the endpoints within normalized tolerance. Use two endpoints for a straight source line and derive guide intersections algebraically; do not bend the line to fit independently estimated pixels. `shape:"piecewise"` or an omitted shape retains existing piecewise behavior for source-supported nonlinear geometry. This validates the declared shape, not whether the agent classified the source correctly.
- Points reference a curve and must lie on it within normalized tolerance. Optional `xLabel` and `yLabel` provide symbolic guide labels; an empty point label avoids inventing A/B names absent from the source.
- Optional point `marker:false` hides a layout anchor's circle while preserving its coordinates, guide lines and labels. Use it for arrow anchors when the source has no dot; `label:""` alone hides text, not the marker. Do not add artificial endpoints to otherwise floating source arrows. Movement arrowheads are 11 SVG units and use a separate marker from axis arrows, with `refX:10, refY:5` aligned exactly to the tip and a butt-capped shaft. Capture checks marker count, size, orientation and shaft cap in both themes/sizes; visual source comparison is still required.
- Optional curve/point `labelPosition: [x, y]` places a label explicitly in data coordinates. Use it to resolve overlap without moving the curve or changing the economics. Review label placement at mobile and desktop sizes.
- Arrows reference point IDs using `from` and `to`, or use exclusive detached `start`/`end` pairs. Areas specify polygon vertices and role `welfare`, `consumer-surplus` or `producer-surplus`; the latter two map to `--graph-consumer-surplus` and `--graph-producer-surplus` CSS tokens. Annotations specify `text`, `x` and `y`.
- Optional arrow `offset: [dx, dy]` translates both ends in axis-coordinate units, keeping the arrow parallel and its direction/length unchanged. For example, `[0, 6]` on a 0-100 price axis places a movement arrow above its curve without moving economic points or guides. Translated endpoints must remain in both axis domains. Omitted offsets preserve existing rendering. Use source inspection to choose the displacement, then revalidate, recapture and inspect before resubmitting; old screenshots cannot verify an edited draft.
- Unknown fields, nonfinite values, out-of-range coordinates, duplicate/unsafe IDs, broken references, empty/degenerate segments, wrong demand/supply direction and off-curve points fail validation. Arrays/text/input size are bounded. Strings become text nodes, never markup.
- Schematic coordinates encode layout, not measured quantities. The renderer does not invent numeric ticks or compute an exact elasticity from slope. Quantitative diagrams require independently supported numerical data and additional topic-specific review.
- Version 1 does not solve equilibrium, evaluate equations, validate every economic proposition, prevent every label collision, or certify polygon economics. Geometry tests are not teacher approval.

## Run on Omarchy / Pi

### Integrated OCR (Default)

Run `/ocr-work TB-01 1` after private sync and reloading Pi. No separate reconstruction command is needed. The same single model/session:

1. Recovers queued diagrams from accepted pages, then resumes pending graph tasks before advancing pages.
2. Inspects a page, extracts and checks original PDF diagram crops, then saves its transcript.
3. Automatically queues only the final referenced `kind: "diagram"` crops at `ocr_accept`.
4. Reads each original, writes a private JSON reconstruction, validates it, captures both themes/mobile/desktop, inspects the screenshots and submits a draft for human review.

No additional model process or session is created. Maximum three reconstructions per OCR turn; pending work stops page advancement and resumes next invocation. Tables, photos, text-only panels and superseded crop versions are not queued. Unsupported geometry can be explicitly deferred with a reason; unavailable browser/vision leaves it pending. Deferrals need human follow-up, not automatic retry. Automated queueing is deterministic; visual reconstruction follows the session's prompt and is not proof of accuracy.

Budget exhaustion is a stop condition, not unsupported geometry. The CLI rejects new deferrals citing budget, context/compaction, interruptions or missing browser/vision. Previously saved deferrals are not silently cleared; an owner-authorized archival recovery is required. Simple polygon shading is supported by `areas`; do not classify all surplus diagrams as unsupported merely because they are shaded. See [durable OCR recovery](OCR_OPERATIONS.md#durable-range-and-interruption-recovery) for range checkpoints and explicit continuation.

Transcript saving precedes queue registration. A queue or render failure does not undo acceptance, delete crops or rewind page checkpoints. Resume recovers the accept-to-queue interruption window with:

```sh
node scripts/graph-work.cjs sync-ocr TB-01
node scripts/graph-work.cjs next TB-01
```

Check the returned `errors` before continuing. Dynamic task IDs and source paths come from the returned packet; never guess or substitute them. Each task verifies crop, metadata and accepted-transcript provenance. OCR originals and reconstructions stay private, without the selected public crops' reuse permission. No app activation or publication happens automatically.

Queue recovery reports `legacySkipped` for accepted pre-crop transcripts that lack `figure_assets` and contain no asset references. These are historical records, not corruption errors; they are left byte-for-byte unchanged. `unlinkedDiagrams` identifies pages needing separate follow-up. Recovery never guesses an association from an existing crop filename. Missing provenance for an explicitly referenced asset, malformed arrays and other integrity failures remain errors.

Schema v1 has one axis system. A composite with independent panels/origins (for example TB-01 Figure 3.3 on PDF page 115) is an unsupported representation and may be explicitly deferred with that reason. Retain its original crop and accepted transcript; do not merge panel-local scales or silently split its accepted asset references. Deferral needs human follow-up and does not mean reconstruction is complete. Browser/vision setup failures must not be disguised as unsupported geometry.

### Standalone Reconstruction

After private sync completes, open Pi in the project root. The project-local prompt and skill use Pi's existing `bash`, file editing and image `read` tools. No new extension, model server or parallel inference worker is needed. Reload Pi if prompt discovery has already happened.

Start with:

```text
/graph-reconstruct 1
```

This asks the current local model to reconstruct at most one pending figure. The unfiltered queue starts with demand Figure 3.2 and PED Figure 7.1, followed by registered OCR tasks. At most two figures can be requested per standalone turn. No startup hook launches this work.

The underlying commands are:

```sh
node scripts/graph-work.cjs init
node scripts/graph-work.cjs status
node scripts/graph-work.cjs next
node scripts/graph-work.cjs validate demand
node scripts/graph-review.cjs demand 4182
node scripts/graph-review.cjs demand --capture
node scripts/graph-work.cjs audit demand
node scripts/graph-work.cjs submit demand
```

`init` creates missing private drafts/evidence only; it never overwrites work. `next` reports the first pending or stale task and includes exact paths, source hash and requirements. The separate loopback review page shows the original beside the native reconstruction and supports both themes. Stop that preview when no longer needed. It serves only fixed review resources and that task's draft/source aliases, never the source collection.

Optional screenshot capture needs Playwright and a local browser. Existing installations can be selected with `PLAYWRIGHT_PATH` and `BROWSER_CHANNEL` (for example `msedge` on Windows), or `BROWSER_EXECUTABLE_PATH` for an existing distribution browser such as `/usr/bin/chromium`. On Omarchy, a machine-local installation can live inside the already sync-excluded runtime directory:

```sh
npm install --prefix .ocr-runtime/graph-browser --no-save playwright
.ocr-runtime/graph-browser/node_modules/.bin/playwright install chromium
node scripts/graph-review.cjs demand --capture
```

Capture automatically discovers this machine-local package location. This is optional tooling, not an app package manager or build requirement. Browser downloads may need network/system dependencies; the script does not install OS packages. The browser tests use `PLAYWRIGHT_PATH` when Playwright is not on Node's usual module search path.

If Omarchy already has `/usr/bin/chromium`, the operator can install only the Playwright package, without downloading another browser. Run these separately in the project terminal while the agent is stopped:

```sh
npm install --prefix .ocr-runtime/graph-browser --no-save --ignore-scripts playwright
export BROWSER_EXECUTABLE_PATH=/usr/bin/chromium
node -e 'const { chromium } = require("./.ocr-runtime/graph-browser/node_modules/playwright"); (async () => { const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE_PATH }); try { const page = await browser.newPage(); await page.setContent("<h1>Browser ready</h1>"); console.log(await page.locator("h1").innerText()); } finally { await browser.close(); } })().catch(error => { console.error(error); process.exitCode = 1; });'
```

Launch Pi from that same terminal so it inherits `BROWSER_EXECUTABLE_PATH`. Package discovery is automatic at the location above. Capture is headless: no connected monitor, X11 or Wayland session is required. A missing Playwright module fails before browser launch; an incompatible browser or missing system library can still fail afterward. Preserve the actual error rather than disabling browser sandboxing. The graph agent's no-install rule remains: this is an explicit operator setup step, not permission for unattended package installation. The smoke check tests browser launch only, not graph fidelity or screenshot inspection.

Pi must actually inspect the original and the rendered screenshots. Capture writes a private `render-manifest.json` with source/spec/screenshot hashes and rejects changes to the inputs during capture; this is provenance, not proof of comprehension. The agent then records `visualInspected`, exact `sourceSha256`, fidelity notes, uncertainties, `renderInspected` and the current `renderSpecSha256` returned by `validate`. If it cannot inspect images or render the graph, leave the draft unresolved. Do not fabricate evidence flags to pass a validator.

## Checkpoints and Publication

### New-Submission Evidence Gate

New submissions and edited revisions require `evidence.fidelityReview` version 1. Get the empty contract from `next`'s `evidenceTemplate`, even for an existing draft. Record `sourceInventory` from the original before drawing: axis titles, chosen plot aspect ratio, curves `{id,label,shape}`, printed dot count `visibleMarkers`, arrows `{kind,description}` in draft-array order, regions `{id,role}`, and unique `guideLabels`. Kind is `movement`, `shift`, `axis-indicator` or `callout`; describe direction and placement. Detached indicators/callouts cannot be replaced with point-anchored arrows. Every draft point must set `marker` explicitly and every curve must declare `shape`.

After reading the actual source and four current previews, complete `checks.geometry`, `labels`, `arrows`, `shading`, `light1440`, `light390`, `dark1440`, `dark390`, each with `{passed:true,notes:"specific inspection observation"}` (12..1000 characters). Arrow descriptions are 12..500 characters. Keep failed checks false and stop for unresolved defects. Bind `fidelityReview.specSha256` to validated draft bytes and `fidelityReview.manifestSha256` to exact manifest bytes. Then run `audit <id>` before `submit`.

The gate verifies four exact task-local PNG paths and bytes, source/spec/manifest consistency, current renderer/style hashes, inventory consistency and completed checks. New-protocol tasks become stale if these artifacts/runtime hashes change. Recorded observations remain model claims, not independent image understanding or teacher approval.

Exact pre-gate snapshots remain readable/idempotent and status reports `fidelityProtocol:"legacy-inspection-flags"`; the corrected 20-graph batch was reviewed under that earlier protocol. Do not delete or rewind it merely to add fields. Any changed evidence/draft creates a new revision and must pass the new gate. See [Failure analysis](GRAPH_FIDELITY_POSTMORTEM.md) for causes and remaining limitations.

### Source-Faithful Visual Checks

New capture manifests include `rendererSha256` and `stylesheetSha256` as well as source/spec/screenshot hashes. Capture fails if runtime files change while rendering and checks all graph text stays within the SVG. Regenerate and inspect previews after renderer or stylesheet changes even when draft bytes are unchanged; legacy draft checkpoints alone do not track the runtime version.

Optional `axes.aspectRatio` sets the plot width/height ratio (0.8 to 2.4). Use the source's plot proportions rather than flattening a tall diagram into the default wide plot. Omitting it preserves the original renderer geometry. This is layout, not economic calibration; apparent slope or pixel distances cannot establish elasticity.

Arrows have two exclusive forms: `{from:"pointId",to:"pointId",offset:[dx,dy]}` for movements tied to economic points, or `{start:[x,y],end:[x,y]}` for detached indicators and label callouts. The latter uses axis-coordinate units and exact endpoints, with bounded reserved margins beside/below the axes. Do not add invisible economic points or invent on-curve arrows just to satisfy an old template. If the source has only price/quantity indicators, reproduce those only. A callout arrow runs from its label toward the intended region, not between unrelated curves.

Areas support `welfare`, `consumer-surplus` and `producer-surplus` roles. Use distinct consumer/producer roles when both regions appear together; CSS controls their colors. External surplus labels need source-supported leaders ending inside their respective polygons. Annotation coordinates are honored without silent clamping; check both text lines and arrow shafts against the actual previews.

For every figure compare curve endpoints/straightness, relative line slopes, intercepts, all guide intersections, axis units, labels, visible point dots, arrow count/direction/placement and shaded regions. Hide dots unless the source actually prints them. Avoid repeated horizontal guides at the same price. Preserve gaps between curves and axes when present. Review all four current screenshots before resubmitting; archive old drafts/evidence/previews and retain immutable submission history. Structural validation alone cannot certify any of these visual judgments.

Drafts, screenshots, evidence and immutable submission snapshots stay under `private-sources/graph-work/`. `submit` saves **drafted_needs_review**, not approved content. Resume checks hash the source, draft and evidence; modifying any makes the previous checkpoint stale. Human archival is required if the bounded snapshot history fills up.

Use one writer on one synced machine. A local writer lock is not a distributed lock. Check both machines before recovering an interrupted lock; do not start OCR and reconstruction inference concurrently. The CLI never calls Pi or a model, and never changes OCR transcripts/checkpoints.

After human fidelity/content review and a publication decision, a contributor may deliberately put the approved spec in a built-in card's `graphSpec`, set its explicit reviewer, update credits and open a tested PR. Private submissions cannot activate the public renderer or publish themselves. Existing textbook image cards remain unchanged until this promotion step. The previous Python reconstruction proposal is superseded by native SVG for browser diagrams; Python remains an option for offline analysis/export, not a required parallel pipeline.

## Verification

```sh
node --test tests/graph.test.cjs tests/graph-work.test.cjs
node tests/graphs.cjs
node tests/graph-review.cjs
node tests/browser.cjs
node tests/theme.cjs
```

The first command needs only Node. Browser checks need Playwright. They cover actual SVG geometry, labels, multiple-instance marker IDs, both palettes, responsive screenshots, private review isolation and reviewed-only app integration. Read the source and screenshots as well as the test results before approving a reconstruction.
