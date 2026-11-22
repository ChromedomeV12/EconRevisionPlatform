# Native graphs and reconstruction

## Decision

The app renders reviewed economics diagrams as **browser-native SVG** through D3 7.9.0 and a small declarative layer in `graph.js`. D3 is vendored and pinned; no CDN or model runs at runtime. The app stays static, vanilla and build-free.

Why: SVG is theme-aware, responsive, inspectable and testable, and it avoids a second rendering stack. A declarative specification also makes invented geometry easier to see. JSXGraph could support interactive geometry, but the current diagrams are fixed revision figures and do not need it.

**Alternative rejected:** Python/Matplotlib images or screenshot tracing. Both hide economic assumptions inside pixels and complicate theme and responsive review. Python remains an option for offline analysis, not a parallel website pipeline.

## Source fidelity

A structurally valid graph can still be wrong. Passing geometry checks does not prove that curves, arrows, dots, labels or shading match the original.

Before drawing, record a source inventory from the original image, independent of the draft: axis titles, plot proportions, curve shapes, printed dot count, every arrow's kind/direction/placement, shaded regions and guide labels. Then reproduce only what the source supports.

- Do not invent an arrow, point, curvature, label or shaded region to fit a template.
- Use detached indicators when the source has detached price/quantity arrows; do not substitute an on-curve movement arrow.
- Hide point dots unless the source prints them. Preserve curve gaps, intercepts and guide intersections.
- Use the source's plot aspect ratio rather than flattening a tall figure.
- If the source is a composite with independent panels or scales, defer it rather than merging axes. Deferral is not completion.

After capture, inspect all four current previews (light/dark, desktop/mobile) and record each checklist result with specific observations. A screenshot that exists is not a screenshot that was understood. Unresolved mismatches stay pending; do not hide them behind an uncertainty note or a passing structural audit.

## Specification boundary

The agent writes bounded JSON, not SVG, JavaScript, arbitrary CSS or evaluated formulas. `EconGraphs.validate(spec)` checks the contract; `EconGraphs.render(spec, document)` renders accessible SVG. The full field contract belongs to `graph.js` and its tests.

Key invariants:

- Curves are piecewise-linear vertices in data coordinates; straight source lines declare `shape:"linear"` and must remain straight.
- Points lie on their curve. Empty labels avoid inventing names. `marker:false` is for layout anchors, not for hiding a printed dot.
- Arrows are either point-anchored movements or detached `start`/`end` indicators/callouts. Use bounded offsets for placement without moving economic geometry.
- Areas carry semantic roles (`welfare`, `consumer-surplus`, `producer-surplus`); CSS supplies colors.
- Unknown fields, nonfinite/out-of-range values, broken references, unsafe IDs, degenerate geometry and wrong demand/supply direction fail validation.
- Schematic coordinates are layout, not measured quantities. Do not infer numerical elasticity or exact quantities from a drawing.

## Workflow

Integrated OCR is the default: `/ocr-work` finishes queued graphs and cards before advancing pages. A turn reconstructs at most three figures. Tables, photographs, text panels and superseded crops are not queued. Unsupported geometry may be explicitly deferred with a reason; unavailable browser/vision remains pending. Budget exhaustion is a stop condition, not a deferral reason.

Recovery after an interrupted accept-to-queue window:

```sh
node scripts/graph-work.cjs sync-ocr TB-01
node scripts/graph-work.cjs next TB-01
```

Standalone reconstruction is available with `/graph-reconstruct 1` after private sync and a Pi reload. The operator commands are:

```sh
node scripts/graph-work.cjs packet ID
node scripts/graph-work.cjs validate ID
node scripts/graph-review.cjs ID 4182
node scripts/graph-review.cjs ID --capture
node scripts/graph-work.cjs audit ID
node scripts/graph-work.cjs submit ID
```

`packet` reads one exact task without changing files; recovery uses it so a book-wide pending task cannot replace the saved range's choice. `next [book]` is for standalone discovery. `init` creates missing private templates only and never overwrites work. `audit` verifies the four task-local previews, source/spec/manifest/runtime hashes and the fidelity record before submission. New submissions and edited revisions require `evidence.fidelityReview`; legacy snapshots remain readable as `legacy-inspection-flags`.

Drafts, screenshots, evidence and immutable submission snapshots stay under `private-sources/graph-work/`. Use one writer across synced checkouts; the CLI never calls a model or changes OCR checkpoints. A local writer lock is not a distributed lock. See [OCR operations](OCR_OPERATIONS.md#durable-range-and-interruption-recovery).

## Publication

`submit` saves `drafted_needs_review`; it does not approve or activate a graph. A human reviews the exact revision and source/render evidence, confirms content and reuse permission, then a contributor may promote the reviewed spec into a built-in card, update credits and open a tested PR. Private submissions cannot activate the public renderer.

## Verification

```sh
node --test tests/graph.test.cjs tests/graph-work.test.cjs
node tests/graphs.cjs
node tests/graph-review.cjs
```

The first needs only Node. Browser checks need Playwright. They cover geometry, labels, markers, both palettes, responsive rendering and private-review isolation. Read the source and screenshots as well as the test result.

See [Graph fidelity analysis](GRAPH_FIDELITY_POSTMORTEM.md) for the failure that produced these gates.
