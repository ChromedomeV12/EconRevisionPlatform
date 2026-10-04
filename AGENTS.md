# AGENTS.md

## Project Purpose

This is a static prototype for an IBDP Economics revision platform. The MVP is a swipe-first knowledge refresher: one point with an immediate explanation and visual per screen. The calm browsing dashboard is secondary; compulsory problem practice is out of the current MVP.

## Current Stack

- `index.html`: application shell, navigation and dialogs. Opens the refresh feed directly.
- `TikTok Econ.html`: compatibility redirect preserving old URLs and section hashes.
- `styles.css`: visual system and desktop/mobile layouts. The study feed has a dark workspace; other views are light.
- `content.js`: original sample cards, rubrics and unit metadata. Not teacher verified.
- `app.js`: refresh feed, browsing overview, search, bookmarks, local submission and review workflows.
- `refresh.js`: independent browsing state, opened timestamps and explicit revisit/confusing preferences.
- `learning.js`: FSRS scheduling, review logs, local dates, persistence validation and legacy migration.
- `decisions.js`: local checks and the future Jev service boundary; no live AI is enabled.
- `vendor/`, `assets/`: pinned browser dependencies, licensed fonts, topic photographs and credits.
- `docs/JEV_INTEGRATION.md`: contracts, backend requirements and evaluation plan.
- `docs/superpowers/`: historical planning notes, superseded where they describe a landing page.

There is no build step, package manager, backend, database, or framework. The browser loads vendored FSRS and Lucide directly.

## Design Rules

- Keep the dashboard serious, readable, and teacher-friendly.
- Let the actual learning feed feel more like a short-form social app.
- Do not turn the whole site into a marketing landing page.
- The first screen is the usable refresh feed. Keep explanations visible immediately; put deeper notes behind Closer look. Keep feature explanations out of the primary interface.
- Use dense but clear study UI: stats, progress, unit cards, chapters, and quick actions.
- Keep deep explanations readable and academic.
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

## Hosting

The public repository is `ChromedomeV12/EconRevisionPlatform`; GitHub Pages is intended to serve the `main` branch root at `https://ChromedomeV12.github.io/EconRevisionPlatform/`.

This project can be hosted on GitHub Pages because it is static. The expected path is:

1. Initialize a Git repository if one does not exist.
2. Commit the static files.
3. Push to a GitHub repository.
4. Enable GitHub Pages from the repository settings, usually from the `main` branch root.

If the repository is named `<username>.github.io`, GitHub Pages can serve it at `https://<username>.github.io/`. Otherwise it will usually be served at `https://<username>.github.io/<repo-name>/`.
