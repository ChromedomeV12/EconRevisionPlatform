# Private OCR operations

This is the operator guide for private source processing. A public clone does not include the corpus, Pi settings or the private tooling. Read `tools/ocr/README.md` and the project transcription/graph/authoring skills on the synced checkout before operating.

## Boundary

Source PDFs, page images, OCR text, transcripts, crops, drafts, evidence and logs stay under private source directories. They are not public assets. Acceptance and a passing hash check do not establish accuracy, teacher review or reuse permission.

Use one writer across synced checkouts. Local locks are not distributed locks. Stop and check the other machine before recovery. Exclude machine-local runtimes, database files and worktree metadata from folder sync; the root-level Syncthing include points to the project exclusion list.

## Before starting

1. Stop the writer on the other machine and let private sync finish.
2. Confirm `.pi/`, `tools/ocr/`, the private tests and the corpus are present, and verify the sync exclusions on every device.
3. Open Pi in the project root, reload after extension/skill changes, and use standalone `node` on PATH.
4. Read the private tooling README and the transcription, graph and authoring skills; work sequentially in one session.

## Checkpoints

| State | Establishes | Does not establish |
| --- | --- | --- |
| Prepared/raw page | Page image, embedded text and independent OCR exist with provenance. | Accepted transcript, graph or card. |
| `transcribed_needs_review` | Structural and hash validation passed. | Accurate transcription, teacher review or permission to publish. |
| Pending graph task | A referenced crop is queued for reconstruction. | A finished or reviewed graph. |
| `drafted_needs_review` | A private reconstruction/evidence snapshot exists. | Public approval or app activation. |
| `deferred_needs_review` | Unsupported work with a recorded reason. | Completion or automatic retry. |

Accepted transcripts survive graph failure. Graph work never rewinds OCR page completion. Report prepared pages, accepted pages and human-reviewed pages separately; a tool launch or planned batch is not completion.

## Run and resume

Pi commands:

```text
/ocr-setup
/ocr-status
/ocr-work TB-01 1
/ocr-range TB-01 START END [1-10]
/ocr-continue
```

Setup prepares local Python/CPU OCR; it does not call the model. The pipeline prepares page images, embedded text and independent OCR, then the current Pi model inspects images and reconciles evidence. A prepared page is not a transcript.

Use a bounded range rather than a whole book. The saved range and durable intent are authoritative; do not start a different batch, create another task ID, or reset a budget to recover context. New pages wait until pending graphs and card drafts are settled.

After graphs, the same session authors 1–3 private card points per accepted page. At most three card-producing pages complete per explicit batch. A source-pinned `no_card_needed` page is tracked separately and does not consume a card slot; a revision of an already-counted page does not add one. The page batch still caps total pages. All outputs remain private and `submitted_needs_review`.

Diagrams are preserved as inspected original-PDF crops with provenance. Only final referenced `kind: "diagram"` crops queue for reconstruction; tables, photographs and text panels do not. A composite with independent scales is deferred, not merged. Reconstruction follows [Graph workflow](GRAPH_WORKFLOW.md).

## Durable Range and Interruption Recovery

The durable intent records the range, batch baseline, accepted/graph/card baselines, last action and compaction diagnostics. `ocr_recovery` derives the next stage from disk, not from memory. It reports `action`, `nextTool`, `remaining` and `stopReasons`.

- Follow the returned action exactly. `register_graphs` runs `sync-ocr`; `resume_graph` uses the exact packet task; `resume_cards` uses the pending page packet; `transcribe` uses `ocr_next` for the saved page.
- `stop_batch` and `range_complete` stop. Only an explicit human `/ocr-continue` starts a new budget baseline. An agent does not invoke it or start a session automatically.
- A resource, provider, vision, browser, context or interruption failure stays pending. It is never a `no_card` or `deferred` decision. Only a real content reason supports a no-card record.
- If a submit or no-card reply disappears, call recovery first. An exact retry of the completed action returns the existing result without a new record or slot. Changed drafts, sources or reasons do not qualify.
- If the process restarts after a timeout or compaction, re-read the exact draft/notes, source image and current render. Hashes and disk artifacts override summaries and prior inspection claims.

## Recovery rules

- **Filenames:** new files use ASCII letters, digits, `-`, `_`, `.`; UTC `YYYYMMDDTHHMMSSZ` in filenames. Reject Windows-reserved characters/device names, control characters, trailing dots/spaces and case-only collisions. Do not rename source files, accepted crops or immutable snapshots without owner authorization and reference/hash checks. Inspect new paths before reporting completion.
- **Locks:** inspect the recorded PID, host and start time. Do not clear a lock merely because it is old. Confirm the writer has stopped on every machine. Never delete drafts, manifests, snapshots or locks to hide an error.
- **Stale setup/writer:** check the exact runtime install lock or writer lock and its worker. Remove only that lock after confirming its owner stopped; retry explicit setup.
- **Sync:** check the root-level exclusion on every device. Verify exclusion before deleting a foreign-platform runtime, or the deletion may propagate to its owner.
- **Missing vision/browser:** leave work pending and preserve the error. Never claim inspection or set evidence flags to pass validation.
- **Incorrect accepted page:** preserve the original evidence and record the correction for review. Do not erase completion markers, transcripts or checkpoints independently.

## Human review and publication

Accepted means structurally accepted, not correct. Teacher review and reuse permission are separate human decisions. Only the human operator may review/export selected work and promote it into a public pack after checking the exact revision and graph fidelity. Do not publish private transcripts, screenshots or source paths.

See [Content pipeline](CONTENT_PIPELINE.md), [Graph workflow](GRAPH_WORKFLOW.md) and [Testing](TESTING.md).
