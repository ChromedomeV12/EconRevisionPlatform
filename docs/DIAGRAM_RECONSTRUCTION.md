# Diagram Reconstruction Backlog

## Current Assets

The selected textbook extracts listed in `assets/diagrams/README.md` are used temporarily. The owner confirmed public reuse permission on 2026-10-12. They remain textbook extracts, not app-authored drawings, and are not teacher verified. The remaining private source collection is not cleared by this decision.

## Future Task: Python Reconstructions

Replace the selected extracts with reproducible Python-generated diagrams, preserving their economics rather than relying on screenshot tracing or OCR guesses.

1. Review each original figure and record all axes, units, curves, point coordinates, arrows, assumptions and captions in structured figure specifications. Mark schematic values explicitly; do not invent numerical coordinates where the textbook only gives symbolic labels.
2. Implement a small deterministic Matplotlib rendering script using those specifications. Keep source PDFs and extraction inputs private; commit only approved specifications, script and generated public assets.
3. Use consistent readable typography, light diagram paper in both themes, and matching accessible text. Preserve correct curve/point relationships and label placement at mobile sizes. Offer a full-size view where needed.
4. Add tests for economic invariants, deterministic output, asset loading, label legibility and responsive framing. Compare output visually with the originals and check that card explanations match.
5. Obtain content review and document the reuse basis and attribution for the reconstructions. A redraw does not automatically remove source rights obligations or establish teacher approval.
6. Switch the cards to the generated files, update credits/provenance and remove unused extracts from current publication inputs. Previously published originals remain in Git history unless a separate history-removal decision is made.

This is a backlog task, not an implemented reconstruction pipeline. Do not describe the current extracts as reconstructed or original app content.
