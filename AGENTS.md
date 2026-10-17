# AGENTS.md

## Project Purpose

Build a static IBDP Economics revision prototype. The MVP opens a swipe-first refresher: one knowledge point, explanation and visual per screen. Keep the browsing dashboard secondary. Compulsory problem practice is outside the MVP.

## Current Stack

Start with `docs/README.md`. Read `CONTRIBUTING.md` for setup, `docs/ARCHITECTURE.md` for runtime and state ownership, `docs/TESTING.md` for checks, and `docs/OCR_OPERATIONS.md` for private operator onboarding. Update these guides when you change commands, state keys, runtime assets or review/publication boundaries.

- `index.html`: application shell, navigation and dialogs. Opens the refresh feed directly.
- `TikTok Econ.html`: compatibility redirect preserving old URLs and section hashes.
- `styles.css`: visual system and desktop/mobile layouts. The study feed has a dark workspace; other views are light.
- `acrylic.css`: acrylic surface layer, rounded controls, frosted navigation, dark reading surface and responsive adjustments. Loaded after the base styles; keep it in the public preview allowlist.
- `theme.js`, `theme.css`: persistent light/dark switch and Catppuccin Mocha color overrides. Theme initializes before styles; preference uses `econ-theme-v1`, independently of study data. Keep both in the public preview allowlist.
- `content.js`: original sample cards, rubrics and unit metadata. Not teacher verified.
- `card-model.js`, `content-bootstrap.js`, `content/*.js`: versioned card contract, replaceable repository/provider adapter and modular editorial demo packs. Use `scripts/card-work.cjs` for private drafts, immutable submissions and operator-selected public projections. Read `docs/CONTENT_PIPELINE.md`. Version 1.0.0 requires backend moderation; the current tools provide no authentication.
- `app.js`: refresh feed, browsing overview, search, bookmarks, local submission and review workflows.
- `feed-controls.js`, `feed-controls.css`: three-button swipe rail, tap actions and hold/drag view dial. Hide workspace chrome only in the swipe view. Preserve pointer cancellation, keyboard alternatives and existing bookmark/manual-revisit state boundaries. Keep both assets in the preview allowlist.
- `graph.js`, `graph.css`, `vendor/d3.min.js`: bounded declarative SVG diagrams with pinned D3 scales. Use semantic CSS color tokens. Do not put executable expressions or styles in geometry. Enable the app renderer only for reviewed built-in `graphSpec` content; keep image cards unchanged until reconstruction review.
- `refresh.js`: independent browsing state, opened timestamps and explicit revisit/confusing preferences.
- `learning.js`: FSRS scheduling, review logs, local dates, persistence validation and legacy migration.
- `decisions.js`: local checks and the future Jev service boundary; no live AI is enabled.
- `vendor/`, `assets/`: pinned browser dependencies, licensed fonts, topic photographs and credits.
- `docs/JEV_INTEGRATION.md`: contracts, backend requirements and evaluation plan.
- `SECURITY.md`, `docs/REPOSITORY_SECURITY.md`: security boundaries, private reporting and GitHub repository controls. `.github/rulesets/main.json` records the live ruleset intent; changing the file does not apply it remotely.
- `docs/DEPLOYMENT_PLAN.md`: phased hosting and backend decisions.
- `docs/GRAPH_WORKFLOW.md`: local Pi graph reconstruction, private review previews and human promotion requirements.
- `docs/superpowers/`: historical planning notes, superseded where they describe a landing page.

The app has no build step, package manager, backend, database or framework. The browser loads vendored FSRS, Lucide and D3. Keep optional Playwright tooling separate from app dependencies.

Keep the locked Python dependencies in `tools/ocr/` separate from the app runtime and build.

## Design Rules

- Keep the dashboard serious, readable, and teacher-friendly.
- Give the learning feed the pace of a short-form social app.
- Open the refresh feed, not a marketing landing page. Show explanations on each card; put deeper notes behind Closer look. Keep feature explanations out of the primary interface.
- Use dense but clear study UI: stats, progress, unit cards, chapters, and quick actions.
- Keep deep explanations readable and academic.
- Preserve the owner-approved PR #5 design: bright white light-mode reading surfaces, layered Mocha dark surfaces, restrained Sapphire accents and rounded controls. Use semantic theme tokens over hard-coded component colors. Keep textbook images and native SVG diagrams on high-contrast light paper. Respect reduced motion/transparency preferences.
- Use Georgia/system serif for knowledge headlines and library titles, Manrope for interface headings, DM Sans for body text, and system monospace for feed position counters. Keep letter spacing at zero. Do not add remote font dependencies.
- Light mode uses the official Catppuccin Latte palette; dark mode uses Mocha. Keep light/dark-specific overrides limited to colors and shadows; preserve the shared layout, typography, blur and light diagram surfaces. Follow the OS preference until the user selects a mode.
- PR #5 replaces PR #4's white/navy/sky-blue dialog overrides. Dialogs use a fixed serif-title header and close button, independently scrolling content, neutral theme text and backdrop. Do not restore the superseded PR #4 overrides.
- Treat `.workspace-layout`, `.shell` and `main` as unframed layout wrappers, not cards. Non-feed shells and the inline sidebar stay transparent. Follow [surface and proportion ownership](docs/ARCHITECTURE.md#surface-and-proportion-ownership); use low-specificity `:where()` for shared surface defaults so one complex selector cannot restyle every page.
- Add dependencies only for a demonstrated project need.

## Implementation Rules

- Keep the demo static and GitHub Pages friendly.
- Use vanilla JavaScript unless a requirement justifies a framework.
- Store local demo progress in `localStorage`.
- Preserve existing section anchors unless there is a strong reason to change them.
- Add content in structured arrays/objects in `content.js`, not scattered through markup.
- Use accessible labels and visible focus states for interactive controls.
- Store learning, saved cards and submissions in `econ-workspace-v2`; store browsing/preferences in `econ-refresh-v1`. Interpret legacy learned flags as previously seen. Do not convert them into recall history.
- Only explicit recall ratings update FSRS. Swipes, bookmarks and viewing answers are not reviews.
- The current feed offers no recall ratings or practice gates. Opened counts are exposure only. Revisit is a manual list, not a mastery estimate or inferred schedule.
- Derive recall statistics from stored reviews. Label browsing statistics as exposure/preferences. Do not fabricate activity to fill charts.
- Treat submitted strings as untrusted: escape them before rendering. Label local approval as personal review.
- Never expose Jev credentials or private references in client code. AI results cannot bypass human approval or mutate the schedule.

## Verification

- `node --test tests/learning.test.cjs` checks scheduling, migration, stats and provider fallbacks.
- `node --test tests/refresh.test.cjs` checks browsing state and preference validation separately from recall.
- `node --test tests/graph.test.cjs tests/graph-work.test.cjs` checks native diagram geometry and resumable private draft validation; `node tests/graphs.cjs` and `node tests/graph-review.cjs` check SVG rendering and private review/app boundaries with Playwright.
- `node --test tests/diagram-data.test.cjs` checks selected textbook image dimensions and figure/copy consistency; `node tests/diagrams.cjs` checks image rendering, enlargement and failure fallbacks using Playwright. `node --test tests/preview.test.cjs` checks the image allowlist and private-source isolation.
- `node tests/browser.cjs` runs Playwright browser checks if Playwright is installed. `PLAYWRIGHT_PATH` can point to a bundled package; `BROWSER_CHANNEL=msedge` can use installed Edge.
- `node tests/theme.cjs` checks theme persistence, system preference, storage failures, unchanged feed geometry/state and both palettes across five widths and all views.
- `node tests/navigation.cjs` checks persistent menu collapse/recovery and fixed dialog headers, focus restoration, keyboard/backdrop closing in both themes across five viewport sizes.
- `node tests/layout.cjs` is required for shared CSS/layout changes: all six views, both themes and six widths. Inspect fresh-document phone/desktop screenshots against the surface contract, including computed wrapper borders/backgrounds, card insets, text wrapping and action rows. Passing interaction/contrast tests is not layout or design approval.
- Browser suites write Git-ignored screenshots under `test-output/`. Layout coverage uses six widths; other suites use their documented viewport matrices.
- `node scripts/serve.cjs 4181` starts a loopback-only, allowlisted preview. Add new public runtime assets to its allowlist. It must never serve the private source collection.
- Directly opening `index.html` also works; keep relative asset URLs for GitHub Pages project paths.

## Private Source Materials

- Keep the local reference collection, `private-sources/Econ Revision App Sources/`, Git-ignored and outside the public repository.
- Read its `START_HERE.md`, `CONTENT_NOTES.md`, and `SOURCE_INDEX.md` before drafting sourced content.
- Keep source IDs, exact PDF/slide pages, assumptions, SL/HL boundaries, and teacher-review status with new draft content.
- Do not commit, force-add, publish or expose the collection's PDFs, extracted text, diagrams or draft briefs through the app. The owner confirmed public reuse permission on 2026-10-12 for selected textbook diagram extracts listed in `assets/diagrams/README.md`. Publish only those extracts; the permission does not cover the rest of the collection.
- Public-use permission and teacher approval are separate checks. Do not assume paraphrasing alone resolves all reuse questions.
- The official full subject guide and applicable amendments are missing. Treat syllabus mapping as provisional until checked.
- Do not serve the workspace root publicly: `.gitignore` is not HTTP access control. Deploy committed app files only.

## Private OCR Workflow

### Cross-Platform Filenames

Use Linux- and Windows-compatible names for new files and directories in the synced workspace, including recovery archives and authoring outputs. Prefer ASCII letters, digits, `-`, `_` and `.`. Use UTC `YYYYMMDDTHHMMSSZ` in filenames, for example `recovery-note-20261014T061143Z.json`. Keep normal ISO timestamps inside JSON fields; do not put their colons in filenames.

Reject these names before writing:

- Path components containing Windows-reserved characters (`< > : " / \ | ? *`) or control characters.
- Names ending in a dot or space.
- Reserved device names: `CON`, `PRN`, `AUX`, `NUL`, `COM1`..`COM9`, `LPT1`..`LPT9`, including names with extensions.
- Names that collide with an existing name after case folding.

Inspect new paths before reporting a recovery or batch complete. On a collision, preserve the existing file and stop or choose a distinct safe suffix. Do not overwrite an archive. These rules require agent checks; no automated filename validator enforces them.

Do not normalize names by renaming original source files, accepted crop IDs, referenced artifacts or immutable snapshots. Obtain owner authorization and check references/hashes before a historical rename. Do not hide filename errors with broad Syncthing ignores or change checkpoints to clear a sync warning.

### First-Round Authoring

Card drafting is integrated into `/ocr-work`, `/ocr-range` and `/ocr-continue`, not a separate slash command. Read `.pi/skills/econ-authoring/SKILL.md`. `ocr_recovery` selects missing graph registration, pending graphs, then stable per-page card tasks before any new page. `ocr_cards packet/submit/no_card` resumes private authoring in the same single session. Each page yields 1-3 points; at most THREE card page tasks per explicit batch. Manual operator topic packs may still use `card-work init` (30 pages/8 cards maximum). No startup inference.

Keep drafts, concerns and submissions under `private-sources/card-work/`. The agent may validate and submit; it must not review, export, approve or publish. Record owner-authorized selected authored cards/native specifications in `content/README.md`; that authorization does not cover raw source materials. Do not rewind OCR checkpoints to recover authoring. Check teacher review and publication permission separately.

Card recovery derives completion from exact immutable submissions, pinned source/graph hashes and current notes, not summaries or a mutable status flag. Immutable history preserves budgets through compaction/restart. Missing templates can be repaired; surviving malformed drafts and stale manifests need inspection, never wholesale replacement. A content-only no-card decision must be source-pinned and cannot hide resource/context/tool failures or existing drafted/submitted work. Only explicit human continuation resets budgets. Run `node --test tests/card-work.test.cjs tests/ocr-recovery.test.mjs` and the isolated Pi loader smoke test after pipeline changes.

### Graph Reconstruction

For each graph submission or revision, complete the source-first `evidence.fidelityReview` inventory/checklist and run `node scripts/graph-work.cjs audit <id>`. The gate checks four task-local captures, source/spec/manifest/runtime hashes and inventory consistency. Keep legacy exact snapshots readable; do not rewrite them or rewind transcription to migrate evidence. Read `docs/GRAPH_FIDELITY_POSTMORTEM.md` for failure causes and audit limits. Artifact checks cannot establish visual comprehension.

Read `.pi/skills/econ-graphs/SKILL.md`. Keep graph checkpoints independent of OCR, and reconstruct sequentially within `/ocr-work` by default. After acceptance, the Pi extension registers only final referenced crops. Use `scripts/graph-work.cjs sync-ocr <book>` to recover interrupted registration and `next <book>` to resume graph drafts before advancing pages.

Limit each OCR turn to three reconstructions in the existing model/session. Defer unsupported diagrams with a reason; leave browser/vision failures pending. Use `/graph-reconstruct 1` for a separate reconstruction turn. Keep drafts, evidence and screenshots in `private-sources/graph-work/`, with submissions marked `drafted_needs_review`. Do not auto-activate drafts, alter OCR checkpoints or run concurrent inference. Follow `docs/GRAPH_WORKFLOW.md` for validation and publication.

### Processing and Recovery

- Read `tools/ocr/README.md` before source-processing work. Pi instructions are in `.pi/skills/econ-transcription/SKILL.md`.
- `.pi/` contains project-local Pi 1.0.0 settings, extension, skill and prompt. It is Git-ignored but must sync privately to the Omarchy machine.
- `.ocr-runtime/` is disposable machine-local tooling. Do not commit it or reuse its Windows environment on Linux; the bootstrap creates platform/path-specific environments.
- Exclude `.ocr-runtime/` from Syncthing on every device. The synced root is the parent Coding/Dev folder: add `#include EconRevisionPlatform/tools/ocr/syncthing.ignore` there, not a nested project `.stignore`. Verify exclusion before deleting a foreign-platform runtime locally, or deletion could propagate to its owner.
- Keep page images, OCR, visual evidence, drafts and transcripts under `private-sources/ocr-work/`, never public assets. Do not modify source PDFs.
- Preserve textbook diagrams with `ocr_crop`: render a bounded original-PDF region, inspect the saved PNG, and attach its `asset_id` to the transcript figure. Keep axes, labels, legends and captions. Existing accepted pages can receive private `figures.md` backfills without rewriting their transcripts. Crops retain provenance hashes and are not automatically publication-cleared or verified; explicitly approved public copies require a separate asset record.
- Use one writer on one synced machine at a time. Local locks are not distributed locks. Check checkpoints after interruption; never clear a lock without checking active workers.
- Prepare/transcribe bounded batches with the current Pi model. Session startup must never launch processes or send model prompts. Setup is explicit via `/ocr-setup`. No parallel inference or second model server.
- Launch OCR with the standalone `node` executable on PATH, never `process.execPath`: standalone Pi may use its own harness executable there. Preserve the `ECON_OCR_CHILD` recursion guard.
- Use Pi 1.0.0's built-in `read` image pipeline, which the owner configured on Omarchy. Preserve the text-only-model guard. Do not fabricate visual evidence or treat image delivery as comprehension.
- Transcription acceptance validates schema and hashes, not accuracy or publication rights. Human review remains required; preserve uncertainties and SL/HL distinctions.
- Run `node tools/ocr/run.mjs test` and `node --test tests/ocr-vision.test.mjs` after changes. The optional Pi loader smoke test is documented in the OCR README.
- Run long topic-focused jobs with `/ocr-range BOOK START END [1-10]` and explicit `/ocr-continue`. Use `ocr_recovery` to derive the scoped next page, pending graphs and remaining budget from durable state. Do not reset a batch after compaction or restart. Keep bounded compaction diagnostics in the private run-intent file. Do not restart the model/session automatically. Leave budget/tool/context failures pending, never deferred. Run `node --test tests/ocr-recovery.test.mjs` after changing these guards.

## Hosting

The public repository is `ChromedomeV12/EconRevisionPlatform`; GitHub Pages is intended to serve the `main` branch root at `https://ChromedomeV12.github.io/EconRevisionPlatform/`.

Use this deployment workflow:

1. Initialize a Git repository if one does not exist.
2. Commit explicit public files on a feature branch and open a pull request.
3. Pass the required `verify` and `adaptive-browser` checks and resolve review conversations, then squash or rebase merge to `main`. Direct pushes, force pushes and deletion of the default branch are blocked by the repository ruleset.
4. GitHub Pages deploys the merged `main` branch root automatically. Verify the successful deployment matches the merged commit.

If the repository is named `<username>.github.io`, GitHub Pages can serve it at `https://<username>.github.io/`. Otherwise it will usually be served at `https://<username>.github.io/<repo-name>/`.
