# Econ / Quick Refresh

A static economics refresher: one knowledge point per swipe, with the explanation immediately visible. Optional deeper notes, saved/revisit lists, a secondary overview, a searchable topic library, and personal card review support the feed.

## Try the demo

[Open the demo](https://ChromedomeV12.github.io/EconRevisionPlatform/).

For local use, open `index.html` in a browser. No installation or build step is needed. Progress is stored in that browser's localStorage. For a loopback preview, run `node scripts/serve.cjs 4181` and open `http://127.0.0.1:4181`.

## Project files

- `index.html`: refresh-first application shell.
- `TikTok Econ.html`: compatibility redirect for old links.
- `styles.css`: responsive interface, light study desk and dark study feed.
- `acrylic.css`: frosted surfaces, rounded controls, serif knowledge headlines and responsive acrylic styling.
- `content.js`: ten original public examples, concise refresh copy, explanations and retained rubrics.
- `app.js`: scroll-snap feed, browsing overview, bookmarks and card studio.
- `refresh.js`: validated browsing state and revisit/confusing preferences.
- `learning.js`: retained legacy FSRS state, scheduling helpers and persistence validation.
- `decisions.js`: local screening and future Jev provider interface.
- `vendor/`: pinned FSRS and Lucide browser bundles with licenses.
- `assets/`: local fonts, photographs and credit information.
- `AGENTS.md`: guidance for future contributors and coding agents.
- `docs/JEV_INTEGRATION.md`: future AI contracts and backend architecture.
- `docs/superpowers/`: historical design and implementation notes.

## Current scope

This is an independent, unofficial educational prototype. Sample content needs teacher review and is not a complete or verified IB syllabus resource. All sample prompts are original demo content; the private source collection has not been republished.

The MVP has no compulsory questions, answer reveals or recall ratings. Touch swipes, mouse-wheel scrolling, keyboard arrows/Page Up/Page Down and navigation buttons move through the feed. A Closer look opens full notes and provenance. Saved and Revisit filters use explicit user choices, not a retention algorithm.

The overview reports unique points opened, points opened today, bookmarks and points set aside. An opened point means at least 65% of its panel entered the visible feed; it does not prove reading, understanding or mastery. Browsing state uses `econ-refresh-v1`. Existing recall history and personal submissions remain in `econ-workspace-v2`; browsing never adds FSRS reviews or changes scheduled dates. Existing scheduling helpers and tests are retained for a possible separate, optional recall mode.

Card submissions are stored and reviewed on the current device. Approval makes a card available in that personal library; it does not publish it or claim teacher verification. Local checks identify missing sources, short text and exact duplicate questions. There are no accounts, shared submissions, backend, or live AI calls.

Jev integration boundaries remain for future advisory assessment and submission screening, with validation, timeouts and fallback. The refresh feed does not call answer assessment. Browsing/preferences must not be relabelled as recall evidence or teacher approval. [The integration plan](docs/JEV_INTEGRATION.md) describes future work.

## Checks

Run `node --test tests/learning.test.cjs tests/refresh.test.cjs` for legacy scheduling, service and browsing-state tests. `node tests/browser.cjs` requires Playwright; it verifies feed navigation (including emulated touch), unchanged recall history, saved/revisit preferences, personal submissions, responsive layouts and private-source isolation. Set `PLAYWRIGHT_PATH` to an existing package path and optionally `BROWSER_CHANNEL=msedge` to use installed Edge. Screenshots are written to the ignored `test-output/` folder.

## Private reference collection

Local research materials belong in `private-sources/Econ Revision App Sources/`, which is excluded from Git. They are not included in this repository or demo. Read that collection's `START_HERE.md` and `CONTENT_NOTES.md` before using it to draft content. Source attribution and teacher review do not establish permission to republish textbooks, diagrams, or exam questions.

Do not deploy the whole local workspace or serve its root publicly: Git ignore rules do not restrict HTTP access. Publish only the committed app files. Never force-add the private source directory.

## Deployment

GitHub Pages serves the root of the `main` branch. Push app changes to `main` to update the demo. Only committed files are available to the Pages build.

See [Git, deployment and pull requests](docs/GIT_WORKFLOW.md) for the exact commit/push workflow, deployment checks, and instructions for opening or reviewing a PR. New files must be staged explicitly: committing changes to `index.html` alone does not include a new stylesheet it references.
