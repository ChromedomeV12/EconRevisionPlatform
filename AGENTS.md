# AGENTS.md

## Project Purpose

This is a static prototype for an IBDP Economics revision platform. The MVP is a swipe-first knowledge refresher: one point with an immediate explanation and visual per screen. The calm browsing dashboard is secondary; compulsory problem practice is out of the current MVP.

## Current Stack

- `index.html`: application shell, navigation and dialogs. Opens the refresh feed directly.
- `TikTok Econ.html`: compatibility redirect preserving old URLs and section hashes.
- `styles.css`: visual system and desktop/mobile layouts. The study feed has a dark workspace; other views are light.
- `acrylic.css`: acrylic surface layer, rounded controls, frosted navigation, dark reading surface and responsive adjustments. Loaded after the base styles; keep it in the public preview allowlist.
- `theme.js`, `theme.css`: persistent light/dark switch and Catppuccin Mocha color overrides. Theme initializes before styles; preference uses `econ-theme-v1`, independently of study data. Keep both in the public preview allowlist.
- `content.js`: original sample cards, rubrics and unit metadata. Not teacher verified.
- `app.js`: refresh feed, browsing overview, search, bookmarks, local submission and review workflows.
- `refresh.js`: independent browsing state, opened timestamps and explicit revisit/confusing preferences.
- `learning.js`: FSRS scheduling, review logs, local dates, persistence validation and legacy migration.
- `decisions.js`: local checks and the future Jev service boundary; no live AI is enabled.
- `vendor/`, `assets/`: pinned browser dependencies, licensed fonts, topic photographs and credits.
- `docs/JEV_INTEGRATION.md`: contracts, backend requirements and evaluation plan.
- `docs/superpowers/`: historical planning notes, superseded where they describe a landing page.

There is no build step, package manager, backend, database, or framework. The browser loads vendored FSRS and Lucide directly.

Private source-processing tools under `tools/ocr/` have their own locked Python dependencies. They are not app runtime or build dependencies.

## Design Rules

- Keep the dashboard serious, readable, and teacher-friendly.
- Let the actual learning feed feel more like a short-form social app.
- Do not turn the whole site into a marketing landing page.
- The first screen is the usable refresh feed. Keep explanations visible immediately; put deeper notes behind Closer look. Keep feature explanations out of the primary interface.
- Use dense but clear study UI: stats, progress, unit cards, chapters, and quick actions.
- Keep deep explanations readable and academic.
- The current design uses a macOS-inspired acrylic treatment: translucent light navigation, subtle tinted surfaces, rounded controls and a dark reading workspace. Keep diagrams on a high-contrast light surface. Respect reduced motion/transparency preferences; use opaque fallbacks where needed.
- Typography has distinct roles: Georgia/system serif for knowledge headlines and library titles, Manrope for interface headings, DM Sans for body text, and system monospace for feed position counters. Keep letter spacing at zero and avoid adding remote font dependencies.
- Dark mode uses the official Catppuccin Mocha palette. Keep theme overrides limited to colors and shadows; preserve the acrylic layout, typography, blur and light diagram surfaces. Follow the OS preference until the user selects a mode.
- Avoid adding dependencies unless the project gains a clear need for them.

## Implementation Rules

- Keep the demo static and GitHub Pages friendly.
- Use vanilla JavaScript unless a future requirement clearly justifies a framework.
- Store local demo progress in `localStorage`.
- Preserve existing section anchors unless there is a strong reason to change them.
- Add content in structured arrays/objects in `content.js`, not scattered through markup.
- Use accessible labels and visible focus states for interactive controls.
- Existing learning, saved cards and submission state lives in `econ-workspace-v2`; browsing/preferences live separately in `econ-refresh-v1`. Keep legacy learned flags as previously seen, never as invented recall history.
- Only explicit recall ratings update FSRS. Swipes, bookmarks and viewing answers are not reviews.
- The current feed offers no recall ratings or practice gates. Opened counts are exposure only. Revisit is a manual list, not a mastery estimate or inferred schedule.
- Recall statistics must derive from stored reviews; browsing statistics must be labelled as exposure/preferences. Do not fabricate activity to fill charts.
- Submitted strings are untrusted. Escape them before rendering, and keep local approval labelled as personal review.
- Never expose Jev credentials or private references in client code. AI results cannot bypass human approval or mutate the schedule.

## Verification

- `node --test tests/learning.test.cjs` checks scheduling, migration, stats and provider fallbacks.
- `node --test tests/refresh.test.cjs` checks browsing state and preference validation separately from recall.
- `node tests/browser.cjs` runs Playwright browser checks if Playwright is installed. `PLAYWRIGHT_PATH` can point to a bundled package; `BROWSER_CHANNEL=msedge` can use installed Edge.
- `node tests/theme.cjs` checks theme persistence, system preference, storage failures, unchanged feed geometry/state and both palettes across five widths and all views.
- Browser tests write Git-ignored screenshots under `test-output/` and check five viewport widths.
- `node scripts/serve.cjs 4181` starts a loopback-only, allowlisted preview. Add new public runtime assets to its allowlist. It must never serve the private source collection.
- Directly opening `index.html` also works; keep relative asset URLs for GitHub Pages project paths.

## Private Source Materials

- The local reference collection is `private-sources/Econ Revision App Sources/`. It is intentionally Git-ignored and absent from the public repository.
- Read its `START_HERE.md`, `CONTENT_NOTES.md`, and `SOURCE_INDEX.md` before drafting sourced content.
- Keep source IDs, exact PDF/slide pages, assumptions, SL/HL boundaries, and teacher-review status with new draft content.
- The collection is not cleared for public distribution. Do not commit, force-add, publish, or expose its PDFs, extracted text, diagrams, or draft briefs through the app.
- Public-use permission and teacher approval are separate checks. Do not assume paraphrasing alone resolves all reuse questions.
- The official full subject guide and applicable amendments are missing. Treat syllabus mapping as provisional until checked.
- Do not serve the workspace root publicly: `.gitignore` is not HTTP access control. Deploy committed app files only.

## Private OCR Workflow

- Read `tools/ocr/README.md` before source-processing work. Pi instructions are in `.pi/skills/econ-transcription/SKILL.md`.
- `.pi/` contains project-local Pi 1.0.0 settings, extension, skill and prompt. It is Git-ignored but must sync privately to the Omarchy machine.
- `.ocr-runtime/` is disposable machine-local tooling. Do not commit it or reuse its Windows environment on Linux; the bootstrap creates platform/path-specific environments.
- Exclude `.ocr-runtime/` from Syncthing on every device. The synced root is the parent Coding/Dev folder: add `#include EconRevisionPlatform/tools/ocr/syncthing.ignore` there, not a nested project `.stignore`. Verify exclusion before deleting a foreign-platform runtime locally, or deletion could propagate to its owner.
- Keep page images, OCR, visual evidence, drafts and transcripts under `private-sources/ocr-work/`, never public assets. Do not modify source PDFs.
- Preserve textbook diagrams with `ocr_crop`: render a bounded original-PDF region, inspect the saved PNG, and attach its `asset_id` to the transcript figure. Keep axes, labels, legends and captions. Existing accepted pages can receive private `figures.md` backfills without rewriting their transcripts. Crops retain provenance hashes and are not publication-cleared or automatically verified.
- Use one writer on one synced machine at a time. Local locks are not distributed locks. Check checkpoints after interruption; never clear a lock without checking active workers.
- Prepare/transcribe bounded batches with the current Pi model. Session startup must never launch processes or send model prompts. Setup is explicit via `/ocr-setup`. No parallel inference or second model server.
- Launch OCR with the standalone `node` executable on PATH, never `process.execPath`: standalone Pi may use its own harness executable there. Preserve the `ECON_OCR_CHILD` recursion guard.
- Vision delegates through Pi 1.0.0's built-in `read` image pipeline, confirmed configured by the user on Omarchy. Preserve the text-only-model guard; never fabricate visual evidence or treat image delivery as comprehension.
- Transcription acceptance validates schema and hashes, not accuracy or publication rights. Human review remains required; preserve uncertainties and SL/HL distinctions.
- Run `node tools/ocr/run.mjs test` and `node --test tests/ocr-vision.test.mjs` after changes. The optional Pi loader smoke test is documented in the OCR README.

## Hosting

The public repository is `ChromedomeV12/EconRevisionPlatform`; GitHub Pages is intended to serve the `main` branch root at `https://ChromedomeV12.github.io/EconRevisionPlatform/`.

This project can be hosted on GitHub Pages because it is static. The expected path is:

1. Initialize a Git repository if one does not exist.
2. Commit the static files.
3. Push to a GitHub repository.
4. Enable GitHub Pages from the repository settings, usually from the `main` branch root.

If the repository is named `<username>.github.io`, GitHub Pages can serve it at `https://<username>.github.io/`. Otherwise it will usually be served at `https://<username>.github.io/<repo-name>/`.
