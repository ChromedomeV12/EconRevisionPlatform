# Hybrid Econ Platform Design

## Goal

Turn the single-page IBDP Economics prototype into a polished static demo with two clear modes: a calm dashboard for progress and structure, and a TikTok-inspired learning feed for short-form revision.

## Design Direction

The product should feel like a serious study tool with social-learning energy. The dashboard should be readable, organized, and teacher-friendly. The learning feed can be more immersive, with high-contrast cards, short explanations, quick actions, and a clear path into deeper notes.

## Interface Structure

- Top navigation stays persistent and compact.
- Hero area introduces the product and shows a phone-like preview.
- Dashboard shows overall progress plus stat cards for lessons learned, XP, streak, and next topic.
- Units and chapters use card grids for structured navigation.
- Swipe feed uses a darker, full-width band with a central reel card and vertical controls.
- Deep dive content stays academic and readable, with tabs for short notes, deeper explanation, examples, and checks.

## Implementation Notes

- Keep the project static: plain HTML, CSS, and JavaScript.
- Store student progress in `localStorage`.
- Avoid external build tools until the project needs them.
- Prefer real topic data in `app.js` over placeholder UI.
- Keep copy student-friendly but suitable for IBDP Economics.

## Future Hosting

The project can be hosted on GitHub Pages as a static site after it is placed in a Git repository and pushed to GitHub. No backend is required for the current demo.
