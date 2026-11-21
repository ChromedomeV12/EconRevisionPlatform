# Private OCR Operations

This is an operator entry point, not a replacement for `tools/ocr/README.md` on the privately synced checkout. The public app needs none of these tools. This guide contains no source text, model credentials or private evidence.

## Before Starting

On a replacement machine, use a fresh frontend Git checkout and follow the private-sync steps below. Preserve accepted transcripts, immutable graph/card submissions and `run-intent.json`. Restore private tests with the tooling. Check durable progress before asking the agent to continue. Run authoring from the normal frontend checkout; create the separate `m1` integration worktree through Git as described in the architecture guide.

1. Stop the writer on the other machine and let private sync finish. Local locks are not distributed locks.
2. Confirm `.pi/`, `tools/ocr/`, the private OCR/Pi tests and the private corpus have synced. Git ignores these operator files; a clone alone does not provide them. Keep public application tests tracked and run private tests from the synced checkout.
3. Exclude machine-local files on every Syncthing device before setup or cleanup. The synced root is the parent Coding/Dev directory: add `#include EconRevisionPlatform/tools/ocr/syncthing.ignore` to that folder's Ignore Patterns on each device, preserving existing rules. The include excludes `.ocr-runtime/`, both repositories' `.git` metadata, the integration worktree directories and the backend's default SQLite database/journals. If `DB_PATH` points elsewhere inside the synced tree, exclude that path and its journals too. Verify the effective rules on each device; a nested project `.stignore` is insufficient. Use Git to transfer commits and private sync to transfer source-processing files. Do not replace a fresh clone's `.git` with synced metadata from another machine.
4. Open Pi 1.0.0 in the project root, review the local extension and reload if it arrived after Pi startup. Use standalone `node` on PATH; never substitute Pi's harness executable.
5. Read the private tooling README and the `econ-transcription`, `econ-graphs` and `econ-authoring` skills. All three stages use the same session, sequentially.

## First Run and Resume

These are **Pi commands**, not terminal shell commands:

```text
/ocr-setup
/ocr-status
/ocr-work TB-01 1
```

Wait for setup to complete, inspect status, then start with one page. `TB-01` and `TB-02` are configured book IDs, not page numbers; the final `1` requests a bounded page batch. Check the private source index for their exact titles. Resume uses checkpoints rather than a guessed next page. Larger batches are capped at ten pages, and pending diagram work can prevent page advancement before that batch count is reached.

Setup prepares local Python/CPU OCR dependencies; it does not call Qwen. The pipeline prepares PDF images, embedded text and independent CPU OCR first. The current Pi model then inspects the images through Pi's built-in `read` pipeline and reconciles the evidence into a transcript. Neither raw OCR nor a schema-valid transcript proves accuracy.

Preserve each diagram as an inspected original-PDF crop with provenance and a transcript asset reference. After transcript acceptance, final referenced diagram crops enter the reconstruction queue. The same model/session creates bounded JSON drafts, validates geometry, captures both themes/mobile/desktop and inspects the results. At most three reconstructions run per OCR turn; no second model/session or concurrent inference should start.

## Checkpoint Meanings

| State | What it establishes | What it does not establish |
| --- | --- | --- |
| Prepared/raw OCR page | Page image, embedded text and independent OCR exist with provenance. | An accepted transcript, graph reconstruction or card draft. |
| `transcribed_needs_review` | Transcript accepted by structural/hash checks. | Accurate transcription, teacher review or permission to publish. |
| Pending graph task | Referenced crop registered for reconstruction. | A finished or reviewed reconstruction. |
| `drafted_needs_review` | Private reconstruction/evidence snapshot submitted. | Public approval or activation in the app. |
| `deferred_needs_review` | Unsupported work recorded with a reason. | Completion or an automatic future retry. |

Accepted transcripts remain durable if graph registration/rendering fails. Graph checkpoints do not advance or rewind OCR page completion.

Report these counts separately. Neither prepared pages nor scratch drafts increase the accepted-transcript count. Verify each claimed completion from its canonical artifact; a tool launch, summary or planned batch is not completion. Keep the global next-page cursor distinct from a saved range's next page.

After graphs, the same OCR command drafts 1-3 swipe points per accepted page, using `ocr_cards` and stable private page tasks. At most THREE card-producing page tasks complete per explicit batch. A page decided `no_card_needed` is recorded separately and does not consume a card slot; a revision of an already-counted page does not add another. The page batch still caps total pages; no extra slash command is needed. New page work is blocked until pending graphs and card drafts are settled. All card submissions remain `submitted_needs_review`; no automatic approval/export/publication. Content-free or already-covered pages need a pinned `no_card_needed` reason, never a resource-failure excuse. See [Content Pipeline](CONTENT_PIPELINE.md).

## Durable Range and Interruption Recovery

After private code sync and a Pi reload, start a topic range with this Pi command:

```text
/ocr-range TB-01 110 176 10
```

This persists the requested range and a bounded batch baseline, then sends exactly one model prompt. It does not authorize all 67 pages in one unbounded turn. After the batch stops, use the explicit Pi command:

```text
/ocr-continue
```

The read-only `ocr_recovery` tool reports actual range progress, the next unfinished range page, pending graphs, pages/graphs completed in the current batch, card-producing pages and no-card pages, last OCR operation and recent compaction diagnostics. `cardPagesSkipped` counts content-only pages decided in the current batch; they do not consume card slots. It differs from `ocr_status`, whose next_page is global. State lives privately in `private-sources/ocr-work/run-intent.json`; accepted page and graph records remain authoritative. Graph budget is derived from immutable submission files, so compaction or a process restart does not reset it. Only an explicit continuation starts a new budget baseline.

Use the packet's `nextTool` hint with its `action`; `remaining` reports page, graph and card-page slots, and `stopReasons` names exhausted limits. A finished range returns `range_complete` even when it uses the last slot. Recovery rejects missing baseline transcripts and malformed run metadata instead of treating them as permission to start over. Restore or investigate missing files before continuing; do not recreate accepted pages from memory.

For `resume_graph`, use `node scripts/graph-work.cjs packet EXACT_TASK_ID` from `nextTool`. This read-only lookup keeps the saved range's task selection; `next BOOK` selects the book-wide queue and may return a different pending page. It remains useful for standalone graph work.

Fresh runs receive a small disk-derived reminder; successful compaction adds passive context without triggering a new turn, and failed/aborted compaction records a bounded diagnostic and warns the operator. No startup process, new session, background retry or inference is launched. If compaction itself fails, preserve the failure, wait for the current run to settle, then explicitly continue. Do not fabricate completed work or erase checkpoints to get past the failure.

For Qwen/flash runs, call recovery before loading instructions and read only the skill for its selected stage. Read one source page/task at a time; use bounded text slices when the packet reports omitted evidence. Keep source inventories and concerns in their private artifact files. After interruption reread those files and the actual images rather than loading the full book or relying on a compressed chat summary. Keep provider and compaction settings unchanged until an observed failure supports a configuration change.

Recovery also reports pending card page tasks and immutable card-history budget. It checks for accepted-but-unqueued diagrams before cards, then finishes graphs and cards before new pages. `/ocr-work` now saves a durable intent too. Explicit continuation upgrades legacy intents to include card backfill within their saved range, without rewriting accepted transcripts. Startup only reads state and never upgrades or starts work.

If card initialization was interrupted, `ocr_cards packet` restores missing templates only. Surviving malformed drafts stay preserved for repair. Exact submitted snapshots avoid duplicates after lost replies; changed source/graph hashes block completion. Do not delete drafts, manifests, snapshots or locks to hide errors, or create another task ID. Only explicit continuation resets budgets. The guards do not protect against an agent deliberately bypassing tools/editing state. After compaction re-read source/render images and private card drafts/notes, not just inspection flags.

If a card `submit` or `no_card` reply disappears, call `ocr_recovery` first. An exact retry of the completed action returns its existing current result with `recovered: true`, even when the batch has stopped. It writes no new record and consumes no extra slot. Changed drafts, source hashes or no-card reasons do not qualify for that replay. Follow the returned action rather than repeating completed work.

Existing free-text runs have no saved range until `/ocr-range` is invoked. Existing incorrect budget-only deferrals still need owner-authorized recovery; these changes do not reopen them automatically. The current compaction token settings are deliberately unchanged: exact provider/Pi failure logs are needed before attributing failures to a token threshold or changing it. Test the recovery helper with `node --test tests/ocr-recovery.test.mjs`.

## Recover Interrupted Registration

These are **terminal commands**, run from the project root while no other writer is active:

```sh
node scripts/graph-work.cjs sync-ocr TB-01
node scripts/graph-work.cjs next TB-01
node scripts/graph-work.cjs status
```

Inspect returned errors before resuming Pi. Use exact task IDs and paths from the returned packet; do not guess them. `sync-ocr` recovers registration from accepted transcripts; it is not a re-transcription command. `/graph-reconstruct 1` remains a separate bounded Pi command when you want to work on the graph queue alone.

## Recovery Rules

- Cross-platform names: follow the filename rules in `AGENTS.md` for all new recovery archives, notes and generated directories. Use compact UTC timestamps such as `recovery-note-20261014T061143Z.json`, never colon-containing ISO filenames. ISO strings inside JSON are fine. Check planned names and inspect newly created paths before reporting completion; preserve files on collisions. Reject Windows-reserved characters/device names, trailing dots/spaces and case-only collisions. Existing source files, referenced crops and immutable records must not be renamed without owner authorization and reference/hash checks. This is an agent/operator rule, not an automated scanner.

- Stale setup lock: inspect the exact runtime `install.lock`, recorded PID and active setup/OCR workers. Only remove that exact lock after confirming its worker is stopped; retry explicit setup afterward. Do not delete the whole runtime as the first remedy.
- Stale writer lock: stop/check workers on both synced machines. Use the documented token-based unlock from the private tooling README, not speculative file deletion.
- Recovery-intent lock: inspect `private-sources/ocr-work/.recovery.lock` and its PID, host and start time. Older empty locks provide no ownership evidence. Confirm the writer has stopped on every machine before operator recovery; the tools do not clear a lock on age alone. Preserve `run-intent.json` and pending recovery files while investigating.
- Sync failures: check the root-level ignore include on every device. Verify exclusion before deleting a foreign-platform runtime locally, or deletion may propagate to the machine using it.
- Missing vision or browser: leave work pending and preserve the error. Never claim inspection or set evidence flags just to satisfy validation.
- Incorrect accepted page: preserve the original evidence and record the correction for review. Do not erase completion markers, transcripts or checkpoint files independently; acceptance revisions require coordinated handling.
- Changed source PDF: preserve/archive the old run intentionally. Do not overwrite sources to make existing hashes pass.

Generated page images, OCR, crops, drafts, transcripts and render evidence stay under the private source directories. Neither acceptance nor reconstruction automatically authorizes publication. Promotion into a built-in app card is a separate reviewed change; follow [Graph workflow](GRAPH_WORKFLOW.md) and the selected [public asset permission record](../assets/diagrams/README.md).
