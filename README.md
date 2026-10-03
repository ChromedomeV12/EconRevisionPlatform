# Econ / Study desk

A working static economics revision app: a study dashboard, a focused card feed, spaced reviews, a searchable topic library, bookmarks, and a personal card submission/review workflow.

## Try the demo

[Open the demo](https://ChromedomeV12.github.io/EconRevisionPlatform/).

For local use, open `index.html` in a browser. No installation or build step is needed. Progress is stored in that browser's localStorage. For a loopback preview, run `node scripts/serve.cjs 4181` and open `http://127.0.0.1:4181`.

## Project files

- `index.html`: dashboard-first application shell.
- `TikTok Econ.html`: compatibility redirect for old links.
- `styles.css`: responsive interface, light study desk and dark study feed.
- `content.js`: ten original sample questions and answer rubrics.
- `app.js`: views, active recall, bookmarks and card studio.
- `learning.js`: FSRS scheduling, activity statistics and persistence.
- `decisions.js`: local screening and future Jev provider interface.
- `vendor/`: pinned FSRS and Lucide browser bundles with licenses.
- `assets/`: local fonts, photographs and credit information.
- `AGENTS.md`: guidance for future contributors and coding agents.
- `docs/JEV_INTEGRATION.md`: future AI contracts and backend architecture.
- `docs/superpowers/`: historical design and implementation notes.

## Current scope

This is an independent, unofficial educational prototype. Sample content needs teacher review and is not a complete or verified IB syllabus resource. All sample prompts are original demo content; the private source collection has not been republished.

Reviews use the FSRS scheduler from `ts-fsrs` 5.4.2, with explicit Again/Hard/Good/Easy ratings. Skipping does not update progress. The dashboard computes due cards, recall, streaks and daily activity from actual logs. Previously marked learned topics are preserved as seen without inventing review dates.

Card submissions are stored and reviewed on the current device. Approval makes a card available in that personal library; it does not publish it or claim teacher verification. Local checks identify missing sources, short text and exact duplicate questions. There are no accounts, shared submissions, backend, or live AI calls.

Jev integration points exist for answer assessment and submission screening, with validation, timeouts and fallback. [The integration plan](docs/JEV_INTEGRATION.md) describes the backend still needed to activate them.

## Checks

Run `node --test tests/learning.test.cjs` for scheduling and service tests. `node tests/browser.cjs` requires Playwright; it verifies the primary workflows and responsive layouts. Set `PLAYWRIGHT_PATH` to an existing package path and optionally `BROWSER_CHANNEL=msedge` to use installed Edge. Screenshots are written to the ignored `test-output/` folder.

## Private reference collection

Local research materials belong in `private-sources/Econ Revision App Sources/`, which is excluded from Git. They are not included in this repository or demo. Read that collection's `START_HERE.md` and `CONTENT_NOTES.md` before using it to draft content. Source attribution and teacher review do not establish permission to republish textbooks, diagrams, or exam questions.

Do not deploy the whole local workspace or serve its root publicly: Git ignore rules do not restrict HTTP access. Publish only the committed app files. Never force-add the private source directory.

## Deployment

GitHub Pages serves the root of the `main` branch. Push app changes to `main` to update the demo. Only committed files are available to the Pages build.
