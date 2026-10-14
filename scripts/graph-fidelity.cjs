"use strict";

const CHECKS = Object.freeze(["geometry", "labels", "arrows", "shading", "light1440", "light390", "dark1440", "dark390"]);
function reviewTemplate() {
  return { version: 1, specSha256: null, manifestSha256: null,
    sourceInventory: { axes: { x: "", y: "" }, plotAspectRatio: null, curves: [], visibleMarkers: null, arrows: [], regions: [], guideLabels: [] },
    checks: Object.fromEntries(CHECKS.map(key => [key, { passed: false, notes: "" }])) };
}

// This compares recorded observations to geometry, not pixels or economic truth.
function auditReview(spec, evidence, hashes) {
  const errors = [];
  const fail = message => errors.push(message);
  const review = evidence?.fidelityReview;
  if (!review || review.version !== 1) return { valid: false, errors: ["New submissions require fidelityReview version 1; inspect the source inventory and all four previews"], notice: "Recorded claims are not independent vision or teacher approval." };
  if (review.specSha256 !== hashes.specSha256) fail("Fidelity review specSha256 is stale");
  if (review.manifestSha256 !== hashes.manifestSha256) fail("Fidelity review manifestSha256 is stale");
  const inventory = review.sourceInventory;
  const normalized = value => typeof value === "string" ? value.replace(/\s+/g, " ").trim() : null;
  if (!inventory || typeof inventory !== "object") fail("Missing sourceInventory");
  else {
    for (const axis of ["x", "y"]) if (normalized(inventory.axes?.[axis]) !== normalized(spec.axes[axis].label)) fail(`Source ${axis} axis label differs from draft`);
    if (typeof inventory.plotAspectRatio !== "number" || inventory.plotAspectRatio !== spec.axes.aspectRatio) fail("Explicit plot aspect ratio must match the recorded source layout choice");
    if (!Array.isArray(inventory.curves) || inventory.curves.length !== spec.curves.length) fail("Source curve inventory count differs from draft");
    else for (const curve of spec.curves) {
      const observed = inventory.curves.filter(c => c?.id === curve.id);
      if (observed.length !== 1 || observed[0].label !== curve.label || !["linear", "piecewise"].includes(observed[0].shape) || observed[0].shape !== curve.shape) fail(`Source curve ${curve.id} label/shape differs; declare source-supported shape explicitly`);
    }
    if (spec.points.some(p => typeof p.marker !== "boolean")) fail("Every point needs explicit marker:true/false; empty labels do not hide dots");
    if (!Number.isInteger(inventory.visibleMarkers) || inventory.visibleMarkers !== spec.points.filter(p => p.marker !== false).length) fail("Visible marker count differs from source inventory");
    if (!Array.isArray(inventory.arrows) || inventory.arrows.length !== spec.arrows.length) fail("Arrow count differs from source inventory; never invent or omit arrows to fit a template");
    else inventory.arrows.forEach((arrow, i) => {
      if (!["movement", "shift", "axis-indicator", "callout"].includes(arrow?.kind) || typeof arrow.description !== "string" || arrow.description.trim().length < 12 || arrow.description.length > 500) fail(`Arrow ${i} needs a source-specific kind and direction/placement description`);
      if (["axis-indicator", "callout"].includes(arrow?.kind) && !spec.arrows[i].start) fail(`Arrow ${i} is detached in the source; do not substitute an on-curve movement`);
    });
    if (!Array.isArray(inventory.regions) || inventory.regions.length !== spec.areas.length) fail("Shaded region count differs from source inventory");
    else for (const area of spec.areas) {
      const regions = inventory.regions.filter(r => r?.id === area.id);
      if (regions.length !== 1 || regions[0].role !== area.role) fail(`Shaded region ${area.id} role differs from source inventory`);
    }
    const labels = [...new Set(spec.guides.flatMap(g => g.axes.map(axis => spec.points.find(p => p.id === g.point)?.[axis === "x" ? "xLabel" : "yLabel"]).filter(Boolean)))].sort();
    if (!Array.isArray(inventory.guideLabels) || inventory.guideLabels.some(x => typeof x !== "string") || JSON.stringify([...inventory.guideLabels].sort()) !== JSON.stringify(labels)) fail("Symbolic/numeric guide labels differ from source inventory");
  }
  for (const key of CHECKS) {
    const check = review.checks?.[key];
    if (check?.passed !== true || typeof check.notes !== "string" || check.notes.trim().length < 12 || check.notes.length > 1000) fail(`Fidelity check ${key} needs passed:true and specific inspection notes; failed checks must remain pending`);
  }
  return { valid: !errors.length, errors, notice: "Checks compare recorded source observations and artifacts; a model can still misread an image. Human review remains required." };
}
module.exports = { CHECKS, reviewTemplate, auditReview };
