# IBDP Economics Swipe Academy

A static revision prototype combining a study dashboard with short revision cards, topic explanations, a mind map, and quizzes.

## Try the demo

[Open the demo](https://ChromedomeV12.github.io/EconRevisionPlatform/).

For local use, open `index.html` in a browser. No installation or build step is needed. Progress is stored in that browser's localStorage.

## Project files

- `index.html`: GitHub Pages entry point; redirects to the existing app page.
- `TikTok Econ.html`: page structure.
- `styles.css`: responsive styling and themes.
- `app.js`: sample content, interactions, and local progress.
- `AGENTS.md`: guidance for future contributors and coding agents.
- `docs/superpowers/`: original design and implementation notes.

## Current scope

This is an independent, unofficial educational prototype. Sample content needs teacher review and is not a complete or verified IB syllabus resource. The demo has no accounts, shared submissions, backend, or live AI integration. Spaced repetition, submission review, and Jev-assisted checks are proposed future work.

## Private reference collection

Local research materials belong in `private-sources/Econ Revision App Sources/`, which is excluded from Git. They are not included in this repository or demo. Read that collection's `START_HERE.md` and `CONTENT_NOTES.md` before using it to draft content. Source attribution and teacher review do not establish permission to republish textbooks, diagrams, or exam questions.

Do not deploy the whole local workspace or serve its root publicly: Git ignore rules do not restrict HTTP access. Publish only the committed app files. Never force-add the private source directory.

## Deployment

GitHub Pages serves the root of the `main` branch. Push app changes to `main` to update the demo. Only committed files are available to the Pages build.
