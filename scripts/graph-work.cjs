"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const os = require("node:os");

const MAX_JSON_BYTES = 128 * 1024;
const WORK_DIR = "private-sources/graph-work";
const TASKS = Object.freeze([
  Object.freeze({ id: "demand", source: "assets/diagrams/demand-figure-3-2.png", figure: "3.2", pdfPage: 114,
    title: "The demand curve", requirements: "Preserve carrot price rise P1 to P2, quantity fall Q1 to Q2, demand curve, labelled points, guides and movement arrow. Other determinants fixed." }),
  Object.freeze({ id: "price-elasticity", source: "assets/diagrams/ped-figure-7-1.png", figure: "7.1", pdfPage: 214,
    title: "The price elastic demand curve", requirements: "Preserve Pepsi Cola price fall P1 to P2, proportionately greater quantity rise Q1 to Q2, demand curve, labelled points, guides and movement arrow. Do not calculate numerical PED from schematic geometry." }),
]);
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const encode = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);

function createWorkflow({ root = path.resolve(__dirname, "..") } = {}) {
  root = path.resolve(root);
  if (!fs.statSync(root).isDirectory() || fs.lstatSync(root).isSymbolicLink()) throw new Error("Workspace root must be a real directory");
  root = fs.realpathSync(root);

  // Check every existing component, not just the final file: junctions can escape too.
  function safe(relative) {
    const target = path.resolve(root, relative);
    const rel = path.relative(root, target);
    if (!rel || rel.startsWith(`..${path.sep}`) || rel === ".." || path.isAbsolute(rel)) throw new Error("Path must stay inside workspace");
    let current = root;
    for (const part of rel.split(path.sep)) {
      current = path.join(current, part);
      try {
        if (fs.lstatSync(current).isSymbolicLink()) throw new Error(`Symlink rejected: ${relative}`);
        const real = path.relative(root, fs.realpathSync(current));
        if (real === ".." || real.startsWith(`..${path.sep}`) || path.isAbsolute(real)) throw new Error("Path escaped workspace");
      } catch (error) { if (error.code !== "ENOENT") throw error; }
    }
    return target;
  }
  function taskFor(id) {
    if (typeof id !== "string" || !/^[a-z][a-z0-9-]{0,47}$/.test(id)) throw new Error("Unsafe task id");
    const task = TASKS.find(item => item.id === id) || readOcrTask(id);
    if (!task) throw new Error(`Unknown task: ${id}`);
    return task;
  }
  function readOcrTask(id) {
    if (!/^ocr-tb-0[12]-p\d+-[a-f0-9]{12}$/.test(id)) return null;
    const task = readJson(`${WORK_DIR}/tasks/${id}.json`).value;
    if (task.id !== id || !["TB-01", "TB-02"].includes(task.book) || !Number.isInteger(task.pdfPage) || task.pdfPage < 1 ||
        typeof task.assetId !== "string" || !/^fig-[a-z0-9][a-z0-9-]{0,59}$/.test(task.assetId)) throw new Error("Invalid OCR graph task");
    const base = `private-sources/ocr-work/${task.book}/pages/${String(task.pdfPage).padStart(5, "0")}`;
    if (task.source !== `${base}/figures/${task.assetId}.png` || task.metadataPath !== `${base}/figures/${task.assetId}.json` ||
        task.transcriptPath !== `${base}/transcription.json` || !/^[a-f0-9]{64}$/.test(task.sourceSha256) || !/^[a-f0-9]{64}$/.test(task.metadataSha256)) throw new Error("OCR graph paths/hash invalid");
    const expectedId = `ocr-${task.book.toLowerCase()}-p${task.pdfPage}-${sha256(JSON.stringify([task.book, task.pdfPage, task.assetId])).slice(0,12)}`;
    if (expectedId !== id || task.requiresDemand !== false) throw new Error("OCR task identity invalid");
    return task;
  }
  function allTasks() {
    const directory = safe(`${WORK_DIR}/tasks`);
    const names = fs.existsSync(directory) ? fs.readdirSync(directory) : [];
    if (names.length > 10000) throw new Error("OCR graph task registry exceeds bound");
    const dynamic = names.filter(name => /^ocr-tb-0[12]-p\d+-[a-f0-9]{12}\.json$/.test(name)).sort().map(name => readOcrTask(name.slice(0,-5)));
    dynamic.sort((a, b) => a.book.localeCompare(b.book) || a.pdfPage - b.pdfPage || a.id.localeCompare(b.id));
    return [...TASKS, ...dynamic];
  }
  function paths(id) {
    const task = taskFor(id);
    return { source: task.source, draft: `${WORK_DIR}/${id}/draft.json`, evidence: `${WORK_DIR}/${id}/evidence.json`, submissions: `${WORK_DIR}/${id}/submissions` };
  }
  function readBytes(relative, max = MAX_JSON_BYTES) {
    const fd = fs.openSync(safe(relative), "r");
    try {
      const stat = fs.fstatSync(fd);
      if (!stat.isFile() || stat.size > max) throw new Error(`Expected regular file <= ${max} bytes: ${relative}`);
      const bytes = Buffer.alloc(stat.size + 1);
      const count = fs.readSync(fd, bytes, 0, bytes.length, 0);
      if (count !== stat.size) throw new Error(`File changed while reading: ${relative}`);
      return bytes.subarray(0, count);
    } finally { fs.closeSync(fd); }
  }
  const readJson = (relative, max) => {
    const bytes = readBytes(relative, max);
    return { bytes, value: JSON.parse(bytes.toString("utf8")) };
  };
  function sourceHash(task) {
    // Approved image files are bounded independently of the JSON input limit.
    const bytes = readBytes(task.source, 8 * 1024 * 1024);
    if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error("Source must be a PNG");
    const hash = sha256(bytes);
    if (task.book) {
      const metadata = readJson(task.metadataPath);
      const record = metadata.value;
      const transcript = readJson(task.transcriptPath, 2 * 1024 * 1024).value;
      if (hash !== task.sourceSha256 || sha256(metadata.bytes) !== task.metadataSha256 || record.image_sha256 !== hash ||
          record.book_id !== task.book || record.pdf_page !== task.pdfPage || record.asset_id !== task.assetId || record.kind !== "diagram" ||
          record.image_path !== task.source || transcript.status !== "transcribed_needs_review" ||
          transcript.book_id !== task.book || transcript.pdf_page !== task.pdfPage ||
          record.source_sha256 !== transcript.source_sha256 || record.evidence_sha256 !== transcript.evidence_sha256 ||
          !transcript.figures?.some(figure => figure.kind === "diagram" && figure.asset_id === task.assetId) ||
          !transcript.figure_assets?.some(asset => asset.asset_id === task.assetId && asset.image_sha256 === hash && asset.metadata_sha256 === task.metadataSha256)) throw new Error("OCR graph no longer matches accepted transcript/crop provenance");
    }
    return hash;
  }
  function mkdir(relative) { fs.mkdirSync(safe(relative), { recursive: true }); }
  function createMissing(relative, value) {
    try { fs.writeFileSync(safe(relative), encode(value), { flag: "wx", mode: 0o600 }); }
    catch (error) { if (error.code !== "EEXIST") throw error; }
  }
  function withWriter(fn) {
    mkdir(WORK_DIR);
    const lock = safe(`${WORK_DIR}/.writer.lock`);
    let fd;
    try { fd = fs.openSync(lock, "wx", 0o600); }
    catch (error) { if (error.code === "EEXIST") throw new Error("Writer lock exists. Check active workers on every synced machine before manually recovering it."); throw error; }
    try {
      fs.writeFileSync(fd, encode({ pid: process.pid, host: os.hostname(), startedAt: new Date().toISOString() }));
      return fn();
    } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
  }
  function packet(task) {
    const sourceSha256 = sourceHash(task);
    return {
      id: task.id, paths: paths(task.id), sourceSha256,
      provenance: { sourceId: task.book || "TB-01", figure: task.figure, pdfViewerPage: task.pdfPage, syllabus: task.book ? "Unconfirmed; preserve source SL/HL labels" : "Common core SL/HL; mapping provisional", teacherReview: "pending", publication: task.book ? "private_reference_only" : "owner_permitted_selected_extract", assetId: task.assetId || null },
      requirements: [task.requirements, "Inspect the original PNG; preserve visible labels and caption. Use schematic coordinates only; these are illustrative positions, not measurements.", "Validation checks structure and provenance, not fidelity, correctness or publication permission. Human review is required."],
      template: { version: 1, id: task.id, title: task.title, description: "Unreconstructed draft; inspect the source before filling geometry.", coordinateMode: "schematic", axes: { x: { label: "Quantity", min: 0, max: 100 }, y: { label: "Price", min: 0, max: 100 } }, curves: [], points: [], guides: [], arrows: [], areas: [], labels: [], review: { status: "draft", reviewer: null } },
      evidenceTemplate: { visualInspected: false, sourceSha256, uncertainties: [], fidelityNotes: "", renderInspected: false, renderSpecSha256: null },
      previewCommand: `node scripts/graph-review.cjs ${task.id}`,
    };
  }
  function init() {
    return withWriter(() => {
      for (const task of allTasks()) {
        const info = packet(task);
        mkdir(`${WORK_DIR}/${task.id}`);
        createMissing(info.paths.draft, info.template);
        createMissing(info.paths.evidence, info.evidenceTemplate);
      }
      return status();
    });
  }
  function enqueuePage(book, page) {
    if (!["TB-01", "TB-02"].includes(book) || !Number.isInteger(page) || page < 1 || page > 99999) throw new Error("Invalid OCR book/page");
    return withWriter(() => {
      const base = `private-sources/ocr-work/${book}/pages/${String(page).padStart(5, "0")}`;
      const transcriptPath = `${base}/transcription.json`;
      const transcript = readJson(transcriptPath, 2 * 1024 * 1024).value;
      if (transcript.status !== "transcribed_needs_review" || transcript.book_id !== book || transcript.pdf_page !== page || !Array.isArray(transcript.figures) || !Array.isArray(transcript.figure_assets) || transcript.figures.length > 128) throw new Error("Expected accepted OCR transcript");
      const queued = [];
      for (const figure of transcript.figures) {
        if (figure.kind !== "diagram" || !figure.asset_id) continue;
        if (!/^fig-[a-z0-9][a-z0-9-]{0,59}$/.test(figure.asset_id)) throw new Error("Unsafe crop asset id");
        const asset = transcript.figure_assets.find(item => item.asset_id === figure.asset_id);
        const metadataPath = `${base}/figures/${figure.asset_id}.json`;
        const metadata = readJson(metadataPath);
        const source = `${base}/figures/${figure.asset_id}.png`;
        const record = metadata.value;
        if (!asset || record.kind !== "diagram" || record.book_id !== book || record.pdf_page !== page || record.asset_id !== figure.asset_id || record.image_path !== source ||
            record.source_sha256 !== transcript.source_sha256 || record.evidence_sha256 !== transcript.evidence_sha256 ||
            asset.metadata_sha256 !== sha256(metadata.bytes) || asset.image_sha256 !== record.image_sha256) throw new Error("Crop/transcript provenance mismatch");
        const id = `ocr-${book.toLowerCase()}-p${page}-${sha256(JSON.stringify([book,page,figure.asset_id])).slice(0,12)}`;
        const task = { id, book, pdfPage: page, assetId: figure.asset_id, source, metadataPath, transcriptPath,
          sourceSha256: record.image_sha256, metadataSha256: sha256(metadata.bytes), figure: record.caption || figure.asset_id,
          title: `Reconstruction ${figure.asset_id}`, requiresDemand: false,
          requirements: "Inspect this original diagram. Preserve supported axes, labels, curves, guides, arrows and caption. Do not infer numerical data or SL/HL applicability. Defer unsupported diagrams rather than inventing geometry." };
        sourceHash(task);
        mkdir(`${WORK_DIR}/tasks`);
        const relative = `${WORK_DIR}/tasks/${id}.json`;
        if (fs.existsSync(safe(relative)) && !readBytes(relative).equals(encode(task))) throw new Error("Registered crop changed; preserve task and investigate source changes");
        createMissing(relative, task);
        const info = packet(task);
        mkdir(`${WORK_DIR}/${id}`);
        createMissing(info.paths.draft, info.template);
        createMissing(info.paths.evidence, info.evidenceTemplate);
        queued.push(id);
      }
      return { book, page, queued: [...new Set(queued)], status: "private_drafts_queued", modelCalled: false };
    });
  }
  function syncOcr(book) {
    if (!["TB-01", "TB-02"].includes(book)) throw new Error("Invalid OCR book");
    const directory = safe(`private-sources/ocr-work/${book}/pages`);
    const names = fs.existsSync(directory) ? fs.readdirSync(directory) : [];
    if (names.length > 2000) throw new Error("OCR page scan exceeds bound");
    const queued = [], errors = [];
    for (const name of names.filter(name => /^\d{5}$/.test(name)).sort()) {
      if (!fs.existsSync(safe(`private-sources/ocr-work/${book}/pages/${name}/transcription.json`))) continue;
      try { queued.push(...enqueuePage(book, Number(name)).queued); }
      catch (error) { errors.push({ page: Number(name), error: error.message }); }
    }
    return { book, queued, errors, modelCalled: false };
  }
  function validate(id) {
    const task = taskFor(id);
    const errors = [];
    try {
      const sourceSha256 = sourceHash(task);
      const draft = readJson(paths(id).draft);
      const spec = draft.value;
      const result = require("../graph.js").validate(spec);
      errors.push(...result.errors);
      if (spec?.id !== id) errors.push("Spec id must match task id");
      if (spec?.coordinateMode !== "schematic") errors.push("Approved sources require schematic coordinates; no numerical PED inference");
      if (spec?.review?.status !== "draft" || spec?.review?.reviewer !== null) errors.push("Private reconstruction must remain draft with reviewer null");
      if (!Array.isArray(spec?.curves) || !spec.curves.length || (task.requiresDemand !== false && !spec.curves.some(curve => curve.role === "demand"))) errors.push("Reconstruction requires supported curves; empty templates are not complete");
      return { id, valid: errors.length === 0, errors, sourceSha256, specSha256: sha256(draft.bytes), notice: "Validation is not correctness or teacher approval." };
    } catch (error) { return { id, valid: false, errors: [...errors, error.message] }; }
  }
  function evidenceErrors(evidence, sourceSha256, specSha256) {
    const errors = [];
    if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) return ["Evidence must be an object"];
    if (evidence.visualInspected !== true) errors.push("Evidence requires visualInspected:true after actual original-image inspection");
    if (evidence.sourceSha256 !== sourceSha256) errors.push("Evidence sourceSha256 does not match current source");
    if (!Array.isArray(evidence.uncertainties) || evidence.uncertainties.length > 64 || evidence.uncertainties.some(item => typeof item !== "string" || !item.trim() || item.length > 2000)) errors.push("Evidence uncertainties must be an array of at most 64 nonempty strings (2000 characters each)");
    if (typeof evidence.fidelityNotes !== "string" || !evidence.fidelityNotes.trim() || evidence.fidelityNotes.length > 8000) errors.push("Evidence requires nonempty fidelityNotes (maximum 8000 characters)");
    if (evidence.renderInspected !== true || evidence.renderSpecSha256 !== specSha256) errors.push("Inspect browser render of current draft, then set renderInspected:true and renderSpecSha256 to current specSha256");
    return errors;
  }
  function current(id) {
    const result = validate(id);
    if (!result.valid) throw new Error(result.errors.join("; "));
    const draft = readJson(paths(id).draft);
    const evidence = readJson(paths(id).evidence);
    if (sha256(draft.bytes) !== result.specSha256) throw new Error("Draft changed during validation");
    const errors = evidenceErrors(evidence.value, result.sourceSha256, result.specSha256);
    if (errors.length) throw new Error(errors.join("; "));
    return { ...result, draft, evidence, evidenceSha256: sha256(evidence.bytes) };
  }
  function snapshotKey(sourceSha256, specSha256, evidenceSha256) {
    return sha256(JSON.stringify([1, sourceSha256, specSha256, evidenceSha256, "drafted_needs_review"]));
  }
  function verifySnapshot(relative, expected) {
    const saved = readJson(relative, MAX_JSON_BYTES * 4 + 8192).value;
    if (saved.version !== 1 || saved.id !== expected.id || saved.status !== "drafted_needs_review" || saved.sourceSha256 !== expected.sourceSha256 || saved.specSha256 !== expected.specSha256 || saved.evidenceSha256 !== expected.evidenceSha256 || saved.specJson !== expected.draft.bytes.toString("utf8") || saved.evidenceJson !== expected.evidence.bytes.toString("utf8")) throw new Error("Submission snapshot is corrupt or does not match current inputs");
    return saved;
  }
  function taskStatus(task) {
    const output = { id: task.id, paths: paths(task.id), status: "pending" };
    try {
      output.sourceSha256 = sourceHash(task);
      const deferred = `${WORK_DIR}/${task.id}/deferred.json`;
      if (fs.existsSync(safe(deferred))) {
        const record = readJson(deferred).value;
        if (record.sourceSha256 === output.sourceSha256 && typeof record.reason === "string" && record.reason.trim()) return { ...output, status: "deferred", reason: record.reason };
      }
      const submissionDir = safe(output.paths.submissions);
      const entries = fs.existsSync(submissionDir) ? fs.readdirSync(submissionDir) : [];
      if (entries.length > 256) throw new Error("Submission history exceeds 256 files; human archival required");
      const hasHistory = entries.some(name => /^[a-f0-9]{64}\.json$/.test(name));
      if (hasHistory) output.status = "stale";
      const inputs = current(task.id);
      output.specSha256 = inputs.specSha256;
      const name = `${snapshotKey(inputs.sourceSha256, inputs.specSha256, inputs.evidenceSha256)}.json`;
      const relative = `${output.paths.submissions}/${name}`;
      if (fs.existsSync(safe(relative))) {
        verifySnapshot(relative, inputs);
        output.status = "submitted";
        output.reviewStatus = "drafted_needs_review";
        output.snapshot = relative;
      }
    } catch (error) { output.errors = [error.message]; }
    return output;
  }
  function status() { return { tasks: allTasks().map(taskStatus), notice: "One writer on one synced machine. Submitted means drafted_needs_review, never approved or published." }; }
  function next(book) {
    const state = status();
    if (book !== undefined && !["TB-01", "TB-02"].includes(book)) throw new Error("Usage: next [TB-01|TB-02]");
    const pending = state.tasks.find(task => !["submitted", "deferred"].includes(task.status) && (!book || taskFor(task.id).book === book));
    return pending ? { ...packet(taskFor(pending.id)), status: pending.status, errors: pending.errors || [] } : {
      complete: true,
      deferred: state.tasks.filter(task => task.status === "deferred" && (!book || taskFor(task.id).book === book)).map(task => ({ id: task.id, reason: task.reason })),
      notice: "No pending tasks. Submitted drafts and deferred diagrams still require human review; nothing approved or published.",
    };
  }
  function defer(id, reason) {
    const task = taskFor(id);
    if (typeof reason !== "string" || !reason.trim() || reason.length > 2000) throw new Error("A specific bounded defer reason is required");
      return withWriter(() => {
        const record = { sourceSha256: sourceHash(task), reason, status: "deferred_needs_review" };
        mkdir(`${WORK_DIR}/${id}`);
        const relative = `${WORK_DIR}/${id}/deferred.json`;
        if (fs.existsSync(safe(relative)) && !readBytes(relative).equals(encode(record))) throw new Error("Existing deferral differs; human recovery required");
        createMissing(relative, record);
      return { id, ...record };
    });
  }
  function submit(id) {
    taskFor(id);
    return withWriter(() => {
      const inputs = current(id);
      const relative = `${paths(id).submissions}/${snapshotKey(inputs.sourceSha256, inputs.specSha256, inputs.evidenceSha256)}.json`;
      mkdir(paths(id).submissions);
      const entries = fs.readdirSync(safe(paths(id).submissions));
      if (entries.length >= 256 && !fs.existsSync(safe(relative))) throw new Error("Submission history full; human archival required");
      const snapshot = { version: 1, id, status: "drafted_needs_review", source: paths(id).source, sourceSha256: inputs.sourceSha256, specSha256: inputs.specSha256, evidenceSha256: inputs.evidenceSha256, submittedAt: new Date().toISOString(), specJson: inputs.draft.bytes.toString("utf8"), evidenceJson: inputs.evidence.bytes.toString("utf8") };
      createMissing(relative, snapshot);
      verifySnapshot(relative, inputs);
      return { id, status: "submitted", reviewStatus: "drafted_needs_review", snapshot: relative, sourceSha256: inputs.sourceSha256, specSha256: inputs.specSha256, evidenceSha256: inputs.evidenceSha256 };
    });
  }
  return { root, paths, init, status, next, validate, submit, enqueuePage, syncOcr, defer };
}

function cliRoot() {
  const workspace = path.resolve(__dirname, "..");
  const override = process.env.ECON_GRAPH_WORK_ROOT;
  if (!override) return workspace;
  const fixtures = path.join(workspace, "private-sources", "graph-work-fixtures");
  const relative = path.relative(fixtures, path.resolve(override));
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error("ECON_GRAPH_WORK_ROOT is only for isolated fixtures beneath private-sources/graph-work-fixtures/<fixture>");
  let component = workspace;
  for (const part of path.relative(workspace, path.resolve(override)).split(path.sep)) {
    component = path.join(component, part);
    if (fs.lstatSync(component).isSymbolicLink()) throw new Error("Symlink fixture override rejected");
  }
  const realBase = fs.realpathSync(fixtures);
  const realRoot = fs.realpathSync(path.resolve(override));
  const realRelative = path.relative(realBase, realRoot);
  if (!realRelative || realRelative === ".." || realRelative.startsWith(`..${path.sep}`) || path.isAbsolute(realRelative) || fs.lstatSync(fixtures).isSymbolicLink()) throw new Error("Fixture override escaped private fixture directory");
  return realRoot;
}

if (require.main === module) {
  try {
    const [command, id, ...extra] = process.argv.slice(2);
    if (!["init", "status", "next", "validate", "submit", "enqueue-page", "sync-ocr", "defer"].includes(command) ||
        (["init", "status"].includes(command) && (id !== undefined || extra.length)) ||
        (["validate", "submit", "sync-ocr"].includes(command) && (!id || extra.length)) ||
        (command === "next" && extra.length) || (command === "enqueue-page" && (!id || extra.length !== 1)) ||
        (command === "defer" && (!id || extra.length !== 1))) throw new Error("Usage: init|status|next [book]|validate <id>|submit <id>|enqueue-page <book> <page>|sync-ocr <book>|defer <id> <reason>");
    const workflow = createWorkflow({ root: cliRoot() });
    const result = command === "enqueue-page" ? workflow.enqueuePage(id, Number(extra[0])) : command === "sync-ocr" ? workflow.syncOcr(id) : command === "defer" ? workflow.defer(id, extra[0]) : workflow[command](id);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (command === "validate" && !result.valid) process.exitCode = 1;
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}

module.exports = { createWorkflow, TASKS, MAX_JSON_BYTES };
