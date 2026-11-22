# Graph fidelity failure: 2026-10-14

This is a decision record, not a bug log. It explains why graph submission gained a source-first evidence gate.

## What failed

1. **The task contract could require an unprinted feature.** A fixed movement arrow was demanded even when the original showed only detached price/quantity indicators. The agent added the arrow to satisfy the contract. The defect was in the instruction, not random file corruption.
2. **The geometry vocabulary was too small.** Arrows had to join on-curve points, so detached indicators and label callouts had no faithful form. Some source arrows were omitted or replaced with economic movements; external surplus labels were left disconnected.
3. **Renderer defaults were mistaken for source observations.** Points showed dots when the source printed none; a default wide plot flattened tall figures; annotation clamping moved labels; adjacent surplus regions shared one fill.
4. **Structural validation was over-trusted.** A monotone polyline can be bent; a valid on-curve point does not establish arrow placement or economics. Screenshot generation and matching hashes do not demonstrate visual comprehension.
5. **Evidence was too coarse.** Submission checked inspection booleans and a spec hash, but not the four screenshots, their manifest or the renderer/style version. Known discrepancies could be recorded as uncertainties without blocking submission.

The archived drafts establish these causes. They do not establish whether quantization, the vision adapter or a particular compaction failure contributed to individual misreadings. No provider or compaction setting was changed on speculation. Accepted transcript/crop provenance stayed intact; rewinding OCR would not repair graph defects.

## What changed

- Source-specific task instructions, explicit straight-line declarations, marker guidance, source-dependent aspect ratios, detached arrows, callout placement and semantic surplus fills.
- Capture records source/spec/renderer/stylesheet/screenshot hashes and checks text bounds. Renderer or stylesheet changes invalidate current evidence.
- New submissions require a `fidelityReview` source inventory and eight specific inspection checks. `audit <id>` verifies the four task-local previews, manifest/spec/source consistency, runtime hashes and the record before submit.
- Legacy snapshots remain readable as `legacy-inspection-flags`; editing one requires the new gate. No automatic migration, fabricated inspection note or checkpoint deletion.
- Skills and prompts require source-first observation, independent preview comparison and the audit gate. One model/session and bounded, sequential work remain.

## Remaining limits

A model can still record a wrong inventory or claim an inspection it did not understand. Hashes prevent stale or inconsistent artifacts; they do not prove every visual or economic judgment. Human review remains required before promotion. Missing vision/browser tools and unresolved visual mismatches stay pending; a passing structure check is not source fidelity.

See [Graph workflow](GRAPH_WORKFLOW.md) for the current contract.
