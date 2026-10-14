# Graph Fidelity Failures: 2026-10-14

## Confirmed Causes

1. **Conflicting task instructions.** The previous fixed PED task in `scripts/graph-work.cjs` required a movement arrow although the inspected original only prints detached price/quantity indicators. Archived agent evidence explicitly describes adding an unprinted arrow to satisfy that requirement. This was a task-contract defect, not random file corruption.
2. **Insufficient geometry vocabulary.** Arrows formerly had to join on-curve points, preventing faithful detached indicators and label callouts. The agent omitted printed arrows or substituted economic movements. External surplus labels were left disconnected from their regions.
3. **Renderer defaults were mistaken for source observations.** Points defaulted to visible dots even when their label was empty. The fixed wide plot flattened some source layouts; annotation clamping moved labels independently of geometry. Adjacent surplus regions shared one fill.
4. **Structural validation was over-trusted.** A monotone polyline can still be bent when the original is straight. Valid on-curve points do not establish correct arrow placement or economics. Screenshot generation and hash consistency do not demonstrate visual comprehension.
5. **Evidence was too coarse.** Submission checked inspection booleans and a spec hash, but did not itself verify the four screenshot files, their manifest or the renderer/style version. Known discrepancies could be listed as uncertainties without blocking submission. There was no structured source-first inventory or per-view comparison record.

The archived drafts and evidence establish these causes. They do not establish whether IQ3 quantization, the vision adapter or a particular compaction failure contributed to individual misreadings. No model/provider settings or compaction token budgets were changed on speculation. Accepted transcript/crop provenance remained intact; rewinding OCR would not repair these graph defects.

## Changes

- Fixed source-specific task instructions, straight-line declarations, explicit marker guidance, source-dependent aspect ratios, detached arrows, clear callout placement and semantic surplus fills.
- `graph-review.cjs` checks text bounds, marker geometry and runtime stability, and captures source/spec/renderer/stylesheet/screenshot hashes.
- `graph-fidelity.cjs` compares a recorded source inventory against the proposed geometry and requires eight specific inspection checks. It does not inspect pixels or certify economics.
- `graph-work.cjs audit <id>` verifies exact four task-local PNGs and their hashes, manifest/source/spec consistency, runtime hashes and the fidelity record. New submissions/revisions must pass it. New-protocol status becomes stale after artifact/runtime changes.
- Pi's OCR handoff, standalone graph prompt, transcription skill and graph skill require source-first observation, independent preview comparison and the audit gate. Existing one-model/sequential/bounded processing and interruption recovery remain in place.
- Existing exact legacy snapshots remain readable and idempotent, explicitly labelled `legacy-inspection-flags`. Editing one requires the new gate; no automatic migration, fake inspection notes or checkpoint deletion occurs.

## Remaining Limits

A model can still record an incorrect source inventory or claim an inspection it did not understand. Counting objects and checking hashes prevents inconsistent or stale artifacts, not every visual/economic error. Keep human review before promotion. Treat missing vision/browser tools and unresolved visual mismatches as pending work; do not replace source fidelity with a passing structure check or an uncertainty disclaimer.

After private sync finishes, reload Pi in the project root to pick up the changed extension/skills. Use the existing bounded OCR or graph command. Source PDFs, accepted transcripts, crops and progress markers are unaffected. See [Graph workflow](GRAPH_WORKFLOW.md) for the current evidence contract.
