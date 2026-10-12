"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { createWorkflow, TASKS, MAX_JSON_BYTES } = require("../scripts/graph-work.cjs");
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");

// Synthetic fixtures test bookkeeping, not fidelity to a textbook image.
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "econ-graph-work-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "assets/diagrams"), { recursive: true });
  for (const task of TASKS) fs.writeFileSync(path.join(root, task.source), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1]));
  const workflow = createWorkflow({ root });
  return { root, workflow, absolute: relative => path.join(root, relative) };
}

function writeJson(file, value) { fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }

function ready(f, id = "demand") {
  f.workflow.init();
  const paths = f.workflow.paths(id);
  const spec = JSON.parse(fs.readFileSync(f.absolute(paths.draft), "utf8"));
  spec.description = "Synthetic schematic fixture, not source reconstruction.";
  spec.curves = [{ id: "D", label: "D", role: "demand", points: [[10, 90], [90, 10]] }];
  writeJson(f.absolute(paths.draft), spec);
  const result = f.workflow.validate(id);
  assert.equal(result.valid, true, result.errors.join("; "));
  const evidence = { visualInspected: true, sourceSha256: result.sourceSha256, uncertainties: [], fidelityNotes: "Synthetic unit-test inspection claim only; not a real visual review.", renderInspected: true, renderSpecSha256: result.specSha256 };
  writeJson(f.absolute(paths.evidence), evidence);
  return { paths, spec, evidence, result };
}

test("init creates missing templates only; next returns bounded exact source packet", t => {
  const f = fixture(t);
  assert.equal(f.workflow.next().id, "demand");
  f.workflow.init();
  const next = f.workflow.next();
  assert.equal(next.paths.draft, "private-sources/graph-work/demand/draft.json");
  assert.equal(next.paths.source, TASKS[0].source);
  assert.equal(next.sourceSha256, hash(fs.readFileSync(f.absolute(next.paths.source))));
  assert.equal(next.template.coordinateMode, "schematic");
  assert.equal(next.provenance.pdfViewerPage, 114);
  const draft = f.absolute(next.paths.draft);
  fs.writeFileSync(draft, "keep existing broken draft");
  f.workflow.init();
  assert.equal(fs.readFileSync(draft, "utf8"), "keep existing broken draft");
  assert.equal(f.workflow.validate("demand").valid, false);
  assert.equal(f.workflow.status().tasks.length, 2);
});

test("submit is immutable and idempotent; next advances only matching hashes", t => {
  const f = fixture(t);
  ready(f);
  const submitted = f.workflow.submit("demand");
  const file = f.absolute(submitted.snapshot);
  const bytes = fs.readFileSync(file);
  assert.equal(submitted.reviewStatus, "drafted_needs_review");
  assert.equal(f.workflow.status().tasks[0].status, "submitted");
  assert.equal(f.workflow.next().id, "price-elasticity");
  assert.equal(f.workflow.submit("demand").snapshot, submitted.snapshot);
  assert.deepEqual(fs.readFileSync(file), bytes);
  ready(f, "price-elasticity");
  f.workflow.submit("price-elasticity");
  assert.equal(f.workflow.next().complete, true);
  const saved = JSON.parse(bytes);
  assert.equal(hash(saved.specJson), submitted.specSha256);
  assert.equal(hash(saved.evidenceJson), submitted.evidenceSha256);
  assert.equal(JSON.parse(saved.specJson).review.status, "draft");
});

test("source, draft byte edits, evidence changes and render hash invalidate resume", t => {
  const f = fixture(t);
  const { paths, evidence } = ready(f);
  const first = f.workflow.submit("demand");
  fs.appendFileSync(f.absolute(paths.draft), " ");
  assert.equal(f.workflow.status().tasks[0].status, "stale");
  assert.equal(f.workflow.next().id, "demand");
  assert.throws(() => f.workflow.submit("demand"), /renderSpecSha256/);
  evidence.renderSpecSha256 = hash(fs.readFileSync(f.absolute(paths.draft)));
  writeJson(f.absolute(paths.evidence), evidence);
  const second = f.workflow.submit("demand");
  assert.notEqual(second.snapshot, first.snapshot);
  evidence.uncertainties.push("Changed review evidence");
  writeJson(f.absolute(paths.evidence), evidence);
  assert.equal(f.workflow.status().tasks[0].status, "stale");
  f.workflow.submit("demand");
  fs.appendFileSync(f.absolute(paths.source), Buffer.from([2]));
  assert.equal(f.workflow.status().tasks[0].status, "stale");
  assert.throws(() => f.workflow.submit("demand"), /sourceSha256/);
  assert.ok(fs.existsSync(f.absolute(first.snapshot)));
});

test("submission requires explicit original/render inspection and structured evidence", t => {
  const f = fixture(t);
  const { paths, evidence } = ready(f);
  for (const change of [
    { visualInspected: false }, { sourceSha256: "0".repeat(64) },
    { uncertainties: "none" }, { uncertainties: [42] }, { fidelityNotes: " " },
    { renderInspected: false }, { renderSpecSha256: "0".repeat(64) },
  ]) {
    writeJson(f.absolute(paths.evidence), { ...evidence, ...change });
    assert.throws(() => f.workflow.submit("demand"));
  }
  assert.equal(fs.existsSync(f.absolute("private-sources/graph-work/.writer.lock")), false);
});

test("draft-only task policy rejects reviewed, quantitative, mismatched and empty specs", t => {
  const f = fixture(t);
  const { paths, spec } = ready(f);
  for (const change of [
    { review: { status: "reviewed", reviewer: "Someone" } },
    { review: { status: "draft", reviewer: "Someone" } },
    { coordinateMode: "quantitative" }, { id: "other" }, { curves: [] },
  ]) {
    writeJson(f.absolute(paths.draft), { ...spec, ...change });
    assert.equal(f.workflow.validate("demand").valid, false);
    assert.throws(() => f.workflow.submit("demand"));
  }
});

test("unknown and traversal ids are rejected before path access", t => {
  const f = fixture(t);
  for (const id of ["../demand", "..", "demand/../../x", "DEMAND", "constructor", "supply", "demand\\x"]) {
    for (const method of ["paths", "validate", "submit"]) assert.throws(() => f.workflow[method](id));
  }
});

test("JSON size, malformed data and snapshot tampering fail closed", t => {
  const f = fixture(t);
  const { paths, evidence } = ready(f);
  const submission = f.workflow.submit("demand");
  const original = fs.readFileSync(f.absolute(paths.draft));
  fs.writeFileSync(f.absolute(paths.draft), Buffer.alloc(MAX_JSON_BYTES + 1, 32));
  assert.match(f.workflow.validate("demand").errors.join(" "), /131072/);
  assert.notEqual(f.workflow.status().tasks[0].status, "submitted");
  fs.writeFileSync(f.absolute(paths.draft), original);
  fs.writeFileSync(f.absolute(paths.evidence), Buffer.alloc(MAX_JSON_BYTES + 1, 32));
  assert.throws(() => f.workflow.submit("demand"), /131072/);
  writeJson(f.absolute(paths.evidence), evidence);
  fs.writeFileSync(f.absolute(submission.snapshot), "{}");
  assert.notEqual(f.workflow.status().tasks[0].status, "submitted");
  assert.throws(() => f.workflow.submit("demand"), /corrupt/);
  assert.equal(fs.readFileSync(f.absolute(submission.snapshot), "utf8"), "{}");
});

test("writer lock blocks init/submit and is never automatically cleared", t => {
  const f = fixture(t);
  ready(f);
  const lock = f.absolute("private-sources/graph-work/.writer.lock");
  fs.writeFileSync(lock, "existing writer on another machine");
  assert.throws(() => f.workflow.init(), /Writer lock/);
  assert.throws(() => f.workflow.submit("demand"), /Writer lock/);
  f.workflow.status();
  assert.equal(fs.readFileSync(lock, "utf8"), "existing writer on another machine");
});

test("source symlink and output directory junction cannot escape workspace", t => {
  const f = fixture(t);
  ready(f);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "econ-graph-outside-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  const source = f.absolute(TASKS[0].source);
  fs.copyFileSync(source, path.join(outside, "source.png"));
  fs.unlinkSync(source);
  try { fs.symlinkSync(path.join(outside, "source.png"), source); }
  catch (error) {
    if (error.code !== "EPERM") throw error;
    fs.copyFileSync(path.join(outside, "source.png"), source);
    // Windows may deny file symlinks; directory junctions still exercise ancestors.
  }
  if (fs.lstatSync(source).isSymbolicLink()) {
    assert.match(f.workflow.validate("demand").errors.join(" "), /Symlink/);
    assert.throws(() => f.workflow.submit("demand"), /Symlink/);
    fs.unlinkSync(source);
    fs.copyFileSync(path.join(outside, "source.png"), source);
  }
  const g = fixture(t);
  fs.mkdirSync(g.absolute("private-sources"));
  const work = g.absolute("private-sources/graph-work");
  try { fs.symlinkSync(outside, work, process.platform === "win32" ? "junction" : "dir"); }
  catch (error) {
    if (!["EPERM", "EACCES", "ENOTSUP"].includes(error.code)) throw error;
    t.skip("Host sandbox does not permit symlink/junction fixtures");
    return;
  }
  assert.throws(() => g.workflow.init(), /Symlink/);
  assert.throws(() => g.workflow.submit("demand"), /Symlink/);
  assert.equal(fs.readdirSync(outside).includes("demand"), false);
});

test("CLI rejects unsafe environment override and unsupported commands without init", () => {
  const script = path.resolve(__dirname, "../scripts/graph-work.cjs");
  const env = { ...process.env, ECON_GRAPH_WORK_ROOT: os.tmpdir() };
  const result = spawnSync(process.execPath, [script, "init"], { env, encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /isolated fixtures/);
  for (const args of [["publish"], ["next", "demand"], ["submit"], ["validate", "demand", "extra"]]) {
    const invalid = spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /Usage:/);
  }
});

function acceptedPage(f, page = 12, book = "TB-01") {
  const base = `private-sources/ocr-work/${book}/pages/${String(page).padStart(5, "0")}`;
  fs.mkdirSync(f.absolute(`${base}/figures`), { recursive: true });
  const source = `${base}/figures/fig-final.png`;
  fs.copyFileSync(f.absolute(TASKS[0].source), f.absolute(source));
  const metadataPath = `${base}/figures/fig-final.json`;
  const metadata = { book_id: book, pdf_page: page, asset_id: "fig-final", kind: "diagram", image_path: source,
    image_sha256: hash(fs.readFileSync(f.absolute(source))), source_sha256: "a".repeat(64), evidence_sha256: "b".repeat(64), caption: "Figure 1" };
  writeJson(f.absolute(metadataPath), metadata);
  const transcript = { book_id: book, pdf_page: page, status: "transcribed_needs_review",
    source_sha256: metadata.source_sha256, evidence_sha256: metadata.evidence_sha256,
    figures: [{ kind: "diagram", asset_id: "fig-final" }, { kind: "table", asset_id: "fig-table" }, { kind: "image", asset_id: "fig-photo" }],
    figure_assets: [{ ...metadata, metadata_sha256: hash(fs.readFileSync(f.absolute(metadataPath))) }] };
  const transcriptPath = f.absolute(`${base}/transcription.json`);
  writeJson(transcriptPath, transcript);
  return { base, source, metadataPath, metadata, transcript, transcriptPath };
}

test("accepted final diagrams queue idempotently, not replaced crops, tables or photos", t => {
  const f = fixture(t), page = acceptedPage(f);
  fs.copyFileSync(f.absolute(page.source), f.absolute(`${page.base}/figures/fig-old.png`));
  const before = fs.readFileSync(page.transcriptPath);
  const queue = f.workflow.enqueuePage("TB-01", 12);
  assert.equal(queue.queued.length, 1);
  assert.equal(queue.modelCalled, false);
  const id = queue.queued[0], inputs = f.workflow.paths(id);
  assert.equal(inputs.source, page.source);
  fs.writeFileSync(f.absolute(inputs.draft), "keep unfinished work");
  assert.deepEqual(f.workflow.enqueuePage("TB-01", 12), queue);
  assert.equal(fs.readFileSync(f.absolute(inputs.draft), "utf8"), "keep unfinished work");
  assert.deepEqual(fs.readFileSync(page.transcriptPath), before);
  assert.equal(f.workflow.next("TB-01").id, id);
  assert.equal(f.workflow.next("TB-02").complete, true);
  assert.equal(f.workflow.next().id, "demand");
});

test("resume recovers acceptance-to-queue interruptions and reports corrupt pages", t => {
  const f = fixture(t);
  acceptedPage(f, 13);
  const bad = acceptedPage(f, 14);
  writeJson(bad.transcriptPath, { ...bad.transcript, status: "draft" });
  const recovered = f.workflow.syncOcr("TB-01");
  assert.equal(recovered.queued.length, 1);
  assert.equal(recovered.errors.length, 1);
  assert.equal(recovered.errors[0].page, 14);
  assert.deepEqual(f.workflow.syncOcr("TB-01"), recovered);
});

test("OCR graph registration rejects unaccepted, altered or mismatched provenance", t => {
  for (const change of ["status", "metadata", "image", "source", "evidence", "traversal"]) {
    const f = fixture(t), p = acceptedPage(f);
    if (change === "status") p.transcript.status = "draft";
    if (change === "metadata") p.transcript.figure_assets[0].metadata_sha256 = "0".repeat(64);
    if (change === "image") fs.appendFileSync(f.absolute(p.source), "changed");
    if (change === "source") p.transcript.source_sha256 = "0".repeat(64);
    if (change === "evidence") p.transcript.evidence_sha256 = "0".repeat(64);
    if (change === "traversal") p.transcript.figures[0].asset_id = "../../escape";
    writeJson(p.transcriptPath, p.transcript);
    assert.throws(() => f.workflow.enqueuePage("TB-01", 12), undefined, change);
    assert.equal(fs.existsSync(f.absolute("private-sources/graph-work/.writer.lock")), false);
  }
});

test("registered non-demand graphs can be drafted; unsupported diagrams defer without approval", t => {
  const f = fixture(t), p = acceptedPage(f);
  const [id] = f.workflow.enqueuePage("TB-01", 12).queued;
  const inputs = f.workflow.paths(id);
  const spec = JSON.parse(fs.readFileSync(f.absolute(inputs.draft)));
  spec.curves = [{ id: "S", label: "S", role: "supply", points: [[10, 10], [90, 90]] }];
  writeJson(f.absolute(inputs.draft), spec);
  assert.equal(f.workflow.validate(id).valid, true);
  assert.throws(() => f.workflow.defer(id, " "), /reason/);
  f.workflow.defer(id, "Source includes a flowchart unsupported by the Cartesian schema.");
  assert.equal(f.workflow.status().tasks.find(task => task.id === id).status, "deferred");
  assert.equal(f.workflow.next("TB-01").complete, true);
  assert.equal(fs.existsSync(f.absolute(inputs.submissions)), false);
  p.transcript.evidence_sha256 = "c".repeat(64);
  writeJson(p.transcriptPath, p.transcript);
  assert.equal(f.workflow.validate(id).valid, false);
  assert.throws(() => f.workflow.next("TB-01"), /provenance/);
});
