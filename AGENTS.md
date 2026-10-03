# AGENTS.md

## Project Purpose

This is a static prototype for an IBDP Economics revision platform. The product direction is a hybrid: a calm study dashboard for structure and progress, plus a TikTok-inspired swipe feed for short, high-attention revision.

## Current Stack

- `index.html`: GitHub Pages entry point, forwarding to the existing app page.
- `TikTok Econ.html`: page structure and semantic anchors.
- `styles.css`: visual system, layout, responsive behavior, light/dark themes.
- `app.js`: topic data, rendering, progress state, quiz behavior, tabs, feed controls.
- `docs/superpowers/`: planning and design notes for future agents.

There is no build step, package manager, backend, database, or framework at this stage.

## Design Rules

- Keep the dashboard serious, readable, and teacher-friendly.
- Let the actual learning feed feel more like a short-form social app.
- Do not turn the whole site into a marketing landing page.
- Use dense but clear study UI: stats, progress, unit cards, chapters, and quick actions.
- Keep deep explanations readable and academic.
- Avoid adding dependencies unless the project gains a clear need for them.

## Implementation Rules

- Keep the demo static and GitHub Pages friendly.
- Use vanilla JavaScript unless a future requirement clearly justifies a framework.
- Store local demo progress in `localStorage`.
- Preserve existing section anchors unless there is a strong reason to change them.
- Add content in structured arrays/objects in `app.js`, not scattered through markup.
- Use accessible labels and visible focus states for interactive controls.

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
