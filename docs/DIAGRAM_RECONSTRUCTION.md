# Diagram reconstruction: historical proposal

**Status: superseded.** Do not treat this file as the current rendering plan. Native D3/SVG is the implemented website path; see [Graph workflow](GRAPH_WORKFLOW.md) and [DECISIONS.md](DECISIONS.md).

## What remains true

- Selected textbook extracts are temporary. They are textbook images, not app-authored drawings, and are not teacher verified.
- The owner confirmed public reuse permission for the selected extracts; that narrow permission does not clear the rest of the source collection.
- A redraw needs its own content review and publication decision. Redrawing does not erase source obligations or create teacher approval.
- Do not invent numerical coordinates, exact elasticities or syllabus claims that the source does not provide.

## Why the Python proposal was superseded

The earlier plan generated diagrams with Matplotlib. That would add a second rendering stack, produce static images that need separate theme/responsive handling, and hide geometry inside pixels. Browser-native SVG keeps the diagram inspectable, themeable, responsive and testable, and makes invented geometry easier to detect.

Python remains an option for offline analysis or export, not a required parallel pipeline. The current renderer, source-fidelity gate and publication boundary are described in [Graph workflow](GRAPH_WORKFLOW.md).
