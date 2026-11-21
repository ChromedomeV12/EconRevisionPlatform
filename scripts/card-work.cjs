"use strict";
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const model = require("../card-model.js");
const { createWorkflow, TASKS } = require("./graph-work.cjs");
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
function createCardWork(root = path.resolve(__dirname, "..")) {
  root = fs.realpathSync(root);
  const base = "private-sources/card-work";
  function safe(relative) {
    const file = path.resolve(root, relative), rel = path.relative(root, file);
    if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) throw new Error("Path outside workspace");
    let current = root;
    for (const component of rel.split(path.sep)) {
      current = path.join(current, component);
      try { if (fs.lstatSync(current).isSymbolicLink()) throw new Error("Linked authoring paths rejected"); }
      catch (error) { if (error.code !== "ENOENT") throw error; }
    }
    return file;
  }
  const read = relative => {
    const file = safe(relative);
    if (!fs.statSync(file).isFile() || fs.statSync(file).size > 2 * 1024 * 1024) throw new Error("Authoring input exceeds bound");
    return fs.readFileSync(file);
  };
  const json = relative => JSON.parse(read(relative));
  const folder = id => { if (typeof id !== "string" || !/^[a-z][a-z0-9-]{0,63}$/.test(id)) throw new Error("Unsafe batch id"); return `${base}/${id}`; };
  function writeNew(relative, value) {
    const file = safe(relative); fs.mkdirSync(path.dirname(file), { recursive: true });
    const temporary = safe(`${relative}.pending-${crypto.randomUUID()}`);
    try {
      fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
      if (fs.existsSync(file)) throw new Error("Existing immutable authoring record");
      fs.renameSync(temporary, file);
    } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  }
  function withWriter(fn) {
    fs.mkdirSync(safe(base), { recursive: true });
    const lock = safe(`${base}/.writer.lock`), fd = fs.openSync(lock, "wx");
    try { fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })); return fn(); }
    finally { fs.closeSync(fd); fs.unlinkSync(lock); }
  }
  function nearbyCoverage(manifest) {
    const names = fs.readdirSync(safe(base));
    if (names.length > 10000) throw new Error("Authoring coverage scan exceeds bound");
    const candidates = [], warnings = [];
    for (const id of names.filter(name => /^[a-z][a-z0-9-]{0,63}$/.test(name) && name !== manifest.id)) {
      const dir = folder(id);
      if (!fs.existsSync(safe(`${dir}/manifest.json`))) continue;
      try {
        const other = json(`${dir}/manifest.json`);
        if (other.book !== manifest.book || !Number.isInteger(other.start) || !Number.isInteger(other.end)) continue;
        const distance = Math.max(0, other.start - manifest.end, manifest.start - other.end);
        if (distance > 20) continue;
        const draft = json(`${dir}/draft.json`), digest = hash(model.canonical(draft));
        const file = `${dir}/submissions/${digest}.json`;
        if (!fs.existsSync(safe(file))) continue;
        const saved = json(file);
        if (saved.status !== "submitted_needs_review" || saved.contentHash !== digest || saved.manifestHash !== hash(read(`${dir}/manifest.json`)) ||
          model.canonical(saved.pack) !== model.canonical(draft) || !model.validatePack(saved.pack).valid) throw new Error("Saved coverage no longer matches its draft/manifest");
        for (const card of saved.pack.cards) candidates.push({ distance, batchId: id, id: card.id, revision: card.revision,
          unit: card.unit, topic: card.topic, level: card.level,
          headline: card.headline, summary: card.summary.slice(0, 240), sources: card.sources,
          status: "private_submission_not_approval" });
      } catch (error) { if (warnings.length < 8) warnings.push({ batchId: id, error: String(error.message).slice(0, 200) }); }
    }
    candidates.sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));
    return { cards: candidates.slice(0, 12), truncated: candidates.length > 12, warnings,
      notice: "Nearby private submissions are coverage hints, not approved content or exhaustive duplicate detection. Compare public packs too. Do not force a card for already-covered material." };
  }
  function unitHint(candidates) {
    const counts = new Map();
    for (const card of candidates) counts.set(card.unit, (counts.get(card.unit) || 0) + 1);
    if (!counts.size) return null;
    const sorted = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return { unit: sorted[0][0], counts: Object.fromEntries(sorted),
      notice: "Derived from nearby submitted cards; verify against the source chapter before using it." };
  }
  function claimWarnings(card) {
    const warnings = [];
    const universal = /\b(every|nothing|always|never|all)\b/i;
    const forward = /\b(later|next page|following page|PPC|production-possibility)\b/i;
    if (universal.test([card.headline, card.summary, card.notes, card.takeaway, card.caution].join(" "))) warnings.push("universal claim; verify it is scoped to the source.");
    if (forward.test(card.notes)) warnings.push("forward reference in notes; pin the later page or remove it.");
    return warnings;
  }
  function packet(id, includeCoverage = true) {
    const dir = folder(id), manifest = json(`${dir}/manifest.json`);
    const history = fs.existsSync(safe(`${dir}/submissions`)) ? fs.readdirSync(safe(`${dir}/submissions`)).filter(n => /^[a-f0-9]{64}\.json$/.test(n)) : [];
    if (history.length > 128) throw new Error("Human archival required for authoring history");
    const currentHash = hash(model.canonical(json(`${dir}/draft.json`)));
    const submitted = history.includes(`${currentHash}.json`) ? json(`${dir}/submissions/${currentHash}.json`) : null;
    const matches = submitted && submitted.status === "submitted_needs_review" && submitted.contentHash === currentHash && submitted.manifestHash === hash(read(`${dir}/manifest.json`)) && model.canonical(submitted.pack) === model.canonical(json(`${dir}/draft.json`)) && model.canonical(submitted.notes) === model.canonical(json(`${dir}/author-notes.json`)) && validate(id).valid;
    const coverage = includeCoverage ? nearbyCoverage(manifest) : null;
    const hint = coverage ? unitHint(coverage.cards) : null;
    return { id, status: matches ? "submitted_needs_review" : "draft", contentHash: currentHash, submittedHashes: history.map(n => n.slice(0, -5)), manifest, draftPath: `${dir}/draft.json`, evidencePath: `${dir}/author-notes.json`,
      ...(coverage ? { nearbyCoverage: coverage, unitHint: hint } : {}),
      instructions: "Read the listed accepted transcripts one at a time and the content cautions. Write original, swipe-first explanations, not copied passages or questions. One idea per card. Keep exact source IDs/pages, a source-consistent unit, and a provisional level; the schema example's unit is illustrative. Reference only listed graph IDs. Record source conflicts and uncertainties in private author-notes.json. Validate then submit; never approve, export, publish, commit or edit app code.",
      schemaExample: { id: "your-point-id", revision: 1, unit: hint?.unit || "intro", topic: "One topic", title: "Short library title", headline: "One declarative knowledge point", summary: "Immediate explanation, under 480 characters.", notes: "Deeper explanation, assumptions and diagram reading.", takeaway: "One compact distinction", caution: "A relevant misconception", related: [], sources: [{ id: manifest.book, page: manifest.pages[0]?.page }], level: "common-core-provisional", graphId: null } };
  }
  function init(id, book, start, end, limit = 6) {
    folder(id);
    if (!["TB-01", "TB-02"].includes(book) || ![start, end, limit].every(Number.isInteger) || start < 1 || end < start || end - start >= 30 || limit < 1 || limit > 8) throw new Error("Use init ID BOOK START END LIMIT (at most 30 pages and 8 cards)");
    return withWriter(() => {
      const dir = folder(id);
      if (fs.existsSync(safe(`${dir}/manifest.json`))) {
        const old = json(`${dir}/manifest.json`);
        if (old.book !== book || old.start !== start || old.end !== end || old.limit !== limit) throw new Error("Existing batch differs; preserve it and choose a new ID");
        // Manifest is durable first; repair only absent templates after interrupted init.
        templates(dir, id);
        return packet(id);
      }
      const pages = [], unavailable = [];
      for (let page = start; page <= end; page++) {
        const transcript = `private-sources/ocr-work/${book}/pages/${String(page).padStart(5, "0")}/transcription.json`;
        if (!fs.existsSync(safe(transcript))) { unavailable.push(page); continue; }
        const bytes = read(transcript), data = JSON.parse(bytes);
        if (data.status !== "transcribed_needs_review" || data.book_id !== book || data.pdf_page !== page) throw new Error(`Invalid accepted page ${page}`);
        pages.push({ page, transcript, sha256: hash(bytes) });
      }
      if (!pages.length) throw new Error("No accepted transcripts in requested range");
      const graphs = {};
      for (const task of createWorkflow({ root }).status({ book, start, end }).tasks.filter(t => t.status === "submitted")) {
        const meta = TASKS.find(t => t.id === task.id) || json(`private-sources/graph-work/tasks/${task.id}.json`);
        if ((meta.book || "TB-01") === book && meta.pdfPage >= start && meta.pdfPage <= end) graphs[task.id] = { page: meta.pdfPage, draft: task.paths.draft, specSha256: task.specSha256 };
      }
      writeNew(`${dir}/manifest.json`, { schemaVersion: 1, id, book, start, end, limit, pages, unavailable, graphs });
      templates(dir, id);
      return packet(id);
    });
  }
  function templates(dir, id) {
    if (!fs.existsSync(safe(`${dir}/draft.json`))) writeNew(`${dir}/draft.json`, { schemaVersion: 1, id, title: "Untitled topic pack", cards: [] });
    if (!fs.existsSync(safe(`${dir}/author-notes.json`))) writeNew(`${dir}/author-notes.json`, { status: "draft", concerns: [], assumptions: [], sourceConflicts: [], teacherReview: "pending" });
  }
  const pageId = (book, page) => {
    if (!["TB-01", "TB-02"].includes(book) || !Number.isInteger(page) || page < 1 || page > 99999) throw new Error("Invalid authoring page");
    return `ocr-${book.toLowerCase()}-p${String(page).padStart(5, "0")}-cards`;
  };
  function pageState(book, page) {
    const id = pageId(book, page), dir = folder(id);
    if (!fs.existsSync(safe(`${dir}/manifest.json`))) return { id, page, status: "uninitialized" };
    try {
      const manifest = json(`${dir}/manifest.json`);
      if (manifest.book !== book || manifest.start !== page || manifest.end !== page || manifest.limit !== 3 || manifest.unavailable.length || manifest.pages.length !== 1) throw new Error("Integrated page manifest differs");
      for (const source of manifest.pages) if (hash(read(source.transcript)) !== source.sha256) throw new Error("Accepted source changed");
      const skipFile = `${dir}/no-card.json`;
      if (fs.existsSync(safe(skipFile))) {
        const skip = json(skipFile);
        if (skip.status !== "no_card_needed" || skip.manifestHash !== hash(read(`${dir}/manifest.json`)) || !["front_matter", "no_knowledge_point", "duplicate_coverage"].includes(skip.kind) || typeof skip.reason !== "string" || skip.reason.length < 20 || json(`${dir}/draft.json`).cards.length) throw new Error("Invalid no-card record");
        return { id, page, status: "no_card_needed", reason: skip.reason, kind: skip.kind };
      }
      json(`${dir}/author-notes.json`);
      const p = packet(id, false);
      return { id, page, status: p.status, contentHash: p.contentHash, errors: validate(id).errors };
    } catch (error) { return { id, page, status: "interrupted_or_stale", errors: [error.message] }; }
  }
  function ensurePage(book, page) { return init(pageId(book, page), book, page, page, 3); }
  function pageHistory(book, page) {
    const dir = folder(pageId(book, page)), submissions = `${dir}/submissions`;
    const entries = fs.existsSync(safe(submissions)) ? fs.readdirSync(safe(submissions)).filter(n => /^[a-f0-9]{64}\.json$/.test(n)) : [];
    if (entries.length > 128) throw new Error("Human archival required for authoring history");
    if (fs.existsSync(safe(`${dir}/no-card.json`))) entries.push("no-card");
    return entries;
  }
  function noCard(book, page, kind, reason) {
    if (!["front_matter", "no_knowledge_point", "duplicate_coverage"].includes(kind) || typeof reason !== "string" || reason.trim().length < 20 || reason.length > 2000 || /budget|compaction|context|timeout|browser|tool failure|provider|interrupt/i.test(reason)) throw new Error("No-card needs a content reason; resource/interruption failures remain pending");
    ensurePage(book, page);
    return withWriter(() => {
      const id = pageId(book, page), dir = folder(id), p = packet(id, false);
      if (p.submittedHashes.length || json(`${dir}/draft.json`).cards.length) throw new Error("Preserve existing card work; cannot skip a drafted/submitted page");
      const record = { status: "no_card_needed", kind, reason: reason.trim(), manifestHash: hash(read(`${dir}/manifest.json`)) };
      const file = `${dir}/no-card.json`;
      if (!fs.existsSync(safe(file))) writeNew(file, record);
      if (model.canonical(json(file)) !== model.canonical(record)) throw new Error("Existing no-card decision differs; human recovery required");
      return pageState(book, page);
    });
  }
  function validate(id, supplied) {
    try {
      const dir = folder(id), manifest = json(`${dir}/manifest.json`), pack = supplied || json(`${dir}/draft.json`);
      const errors = model.validatePack(pack).errors;
      if (pack.id !== id || pack.cards.length > manifest.limit) errors.push("Pack identity or batch card limit differs");
      const pages = new Map(manifest.pages.map(p => [p.page, p]));
      for (const p of manifest.pages) if (hash(read(p.transcript)) !== p.sha256) errors.push(`Accepted transcript ${p.page} changed; investigate, never rewrite it`);
      for (const card of pack.cards || []) {
        if (!card.sources?.some(s => s.id === manifest.book && pages.has(s.page))) errors.push(`${card.id}: cite an accepted page from this batch`);
        for (const source of card.sources || []) if (source.id !== "original" && (source.id !== manifest.book || !pages.has(source.page))) errors.push(`${card.id}: source outside accepted batch`);
        if (card.graphId) {
          const graph = manifest.graphs[card.graphId];
          if (!graph || hash(read(graph.draft)) !== graph.specSha256 || !card.sources.some(s => s.id === manifest.book && s.page === graph.page)) errors.push(`${card.id}: graph missing, stale or not cited`);
        }
      }
      const notes = json(`${dir}/author-notes.json`);
      for (const key of ["concerns", "assumptions", "sourceConflicts"]) if (!Array.isArray(notes[key]) || notes[key].length > 40 || notes[key].some(x => typeof x !== "string" || x.length > 2000)) errors.push("Invalid private author notes");
      const warnings = [];
      try {
        const coverage = nearbyCoverage(manifest);
        const hint = unitHint(coverage.cards);
        for (const card of pack.cards || []) {
          if (hint && card.unit !== hint.unit) warnings.push(`${card.id}: unit ${card.unit} differs from nearby modal unit ${hint.unit}; verify against the source chapter.`);
          warnings.push(...claimWarnings(card).map(w => `${card.id}: ${w}`));
        }
      } catch (error) { warnings.push(`Coverage hints unavailable: ${error.message}`); }
      return { id, valid: !errors.length, errors, warnings, contentHash: hash(model.canonical(pack)), notice: "Validation is not economics review, reuse clearance or authority to publish." };
    } catch (error) { return { id, valid: false, errors: [error.message] }; }
  }
  function submit(id) {
    return withWriter(() => {
      const result = validate(id); if (!result.valid) throw new Error(result.errors.join("; "));
      const dir = folder(id), file = `${dir}/submissions/${result.contentHash}.json`;
      if (fs.existsSync(safe(`${dir}/no-card.json`))) throw new Error("Existing no-card record requires human recovery before submission");
      const submission = { status: "submitted_needs_review", contentHash: result.contentHash, pack: json(`${dir}/draft.json`), notes: json(`${dir}/author-notes.json`), manifestHash: hash(read(`${dir}/manifest.json`)) };
      const prior = fs.existsSync(safe(`${dir}/submissions`)) ? fs.readdirSync(safe(`${dir}/submissions`)).filter(n => /^[a-f0-9]{64}\.json$/.test(n)) : [];
      if (prior.length >= 128 && !fs.existsSync(safe(file))) throw new Error("Human archival required for authoring history");
      for (const name of prior) for (const old of json(`${dir}/submissions/${name}`).pack.cards) {
        const next = submission.pack.cards.find(c => c.id === old.id);
        if (next && model.canonical(next) !== model.canonical(old) && next.revision <= old.revision) throw new Error(`${next.id}: increase revision when changing submitted content`);
      }
      if (!fs.existsSync(safe(file))) writeNew(file, submission);
      const saved = json(file); if (model.canonical(saved) !== model.canonical(submission)) throw new Error("Immutable submission conflicts; change card revision before resubmitting");
      return { id, status: submission.status, contentHash: result.contentHash, submission: file };
    });
  }
  function review(id, digest, reviewer, permissionConfirmed) {
    if (!permissionConfirmed || !/^[a-f0-9]{64}$/.test(digest) || typeof reviewer !== "string" || reviewer.trim().length < 3 || reviewer.length > 150) throw new Error("Operator review needs exact submission hash, reviewer and explicit publication-permission confirmation");
    return withWriter(() => {
      const dir = folder(id), submission = json(`${dir}/submissions/${digest}.json`), result = validate(id, submission.pack);
      if (!result.valid || result.contentHash !== digest || submission.manifestHash !== hash(read(`${dir}/manifest.json`))) throw new Error("Submission is stale or invalid");
      const record = { status: "editorially_selected", contentHash: digest, reviewer, publicationPermission: "owner-confirmed-selected-authored-cards-and-native-graphs", teacherReview: "pending" };
      const file = `${dir}/reviews/${digest}.json`;
      if (!fs.existsSync(safe(file))) writeNew(file, record);
      if (model.canonical(json(file)) !== model.canonical(record)) throw new Error("Existing review differs");
      return record;
    });
  }
  function project(id, digest) {
    if (!/^[a-f0-9]{64}$/.test(digest)) throw new Error("Exact submission hash required");
    const dir = folder(id), saved = json(`${dir}/submissions/${digest}.json`), review = json(`${dir}/reviews/${digest}.json`);
    const result = validate(id, saved.pack);
    if (!result.valid || review.status !== "editorially_selected" || review.contentHash !== digest || result.contentHash !== digest || saved.manifestHash !== hash(read(`${dir}/manifest.json`))) throw new Error("Matching current operator review required");
    const graphs = {}, manifest = json(`${dir}/manifest.json`);
    for (const card of saved.pack.cards) if (card.graphId && !graphs[card.graphId]) {
      const graph = json(manifest.graphs[card.graphId].draft);
      graph.review = { status: "reviewed", reviewer: `${review.reviewer}; editorial demo selection, teacher verification pending` };
      if (!require("../graph.js").validate(graph).valid) throw new Error("Invalid selected graph");
      graphs[card.graphId] = graph;
    }
    const payload = { pack: saved.pack, graphs };
    if (/(private-sources|\.ocr-runtime|\.pi)[/\\]|[A-Z]:\\|\/home\//i.test(JSON.stringify(payload))) throw new Error("Private file paths cannot enter public projection");
    return payload;
  }
  function exportPack(id, digest) {
    return withWriter(() => {
      const payload = project(id, digest), destination = `content/${id}.js`;
      const output = `/* Selected editorial draft. Not teacher verified. Generated by card-work export. */\n(() => {\n  const data = ${JSON.stringify(payload, null, 2)};\n  globalThis.EconPublished ||= { packs: [], graphs: {} };\n  EconPublished.packs.push(data.pack);\n  Object.assign(EconPublished.graphs, data.graphs);\n})();\n`;
      fs.mkdirSync(safe("content"), { recursive: true });
      if (fs.existsSync(safe(destination))) {
        const previous = fs.readFileSync(safe(destination));
        if (previous.toString() === output) return { id, destination, cards: payload.pack.cards.length, graphs: Object.keys(payload.graphs).length };
        const archive = `${folder(id)}/public-history/${hash(previous)}.js`;
        if (!fs.existsSync(safe(archive))) { fs.mkdirSync(path.dirname(safe(archive)), { recursive: true }); fs.writeFileSync(safe(archive), previous, { flag: "wx" }); }
      }
      const pending = `${destination}.pending-${crypto.randomUUID()}`;
      try { fs.writeFileSync(safe(pending), output, { flag: "wx" }); fs.renameSync(safe(pending), safe(destination)); }
      finally { if (fs.existsSync(safe(pending))) fs.unlinkSync(safe(pending)); }
      return { id, destination, cards: payload.pack.cards.length, graphs: Object.keys(payload.graphs).length };
    });
  }
  function audit(book = "TB-01", start = 1, end = 99999) {
    if (!["TB-01", "TB-02"].includes(book) || !Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) throw new Error("Use audit BOOK START END");
    const prefix = `ocr-${book.toLowerCase()}-p`, rows = [];
    for (const name of fs.readdirSync(safe(base)).filter(n => n.startsWith(prefix) && n.endsWith("-cards")).sort()) {
      const match = name.match(new RegExp(`^${prefix}(\\d{5})-cards$`));
      if (!match) continue;
      const page = Number(match[1]);
      if (page < start || page > end) continue;
      const dir = folder(name);
      if (!fs.existsSync(safe(`${dir}/manifest.json`))) continue;
      try {
        const manifestPath = `${dir}/manifest.json`, manifest = json(manifestPath);
        const noCardFile = `${dir}/no-card.json`;
        if (fs.existsSync(safe(noCardFile))) {
          const skip = json(noCardFile);
          const sourcesCurrent = manifest.pages.every(p => hash(read(p.transcript)) === p.sha256);
          const current = skip.status === "no_card_needed" && skip.manifestHash === hash(read(manifestPath)) && sourcesCurrent;
          rows.push({ id: name, page, status: current ? "no_card_needed" : "stale_no_card", kind: skip.kind, reason: skip.reason });
          continue;
        }
        const draft = json(`${dir}/draft.json`), digest = hash(model.canonical(draft));
        const notes = json(`${dir}/author-notes.json`);
        const submission = fs.existsSync(safe(`${dir}/submissions/${digest}.json`)) ? digest : null;
        const saved = submission ? json(`${dir}/submissions/${digest}.json`) : null;
        const sourcesCurrent = manifest.pages.every(p => hash(read(p.transcript)) === p.sha256);
        const current = saved && saved.status === "submitted_needs_review" && saved.contentHash === digest
          && saved.manifestHash === hash(read(manifestPath)) && model.canonical(saved.pack) === model.canonical(draft)
          && model.canonical(saved.notes) === model.canonical(notes) && sourcesCurrent;
        const packValidation = model.validatePack(draft);
        for (const card of draft.cards || []) {
          const warnings = packValidation.errors.filter(error => error.startsWith(`${card.id}:`)).slice(0, 5);
          warnings.push(...claimWarnings(card));
          rows.push({ id: name, page, status: current ? "submitted_needs_review" : submission ? "stale_submission" : "draft",
            cardId: card.id, revision: card.revision, unit: card.unit, topic: card.topic, headline: card.headline,
            sources: card.sources, contentHash: digest, submission, warnings });
        }
      } catch (error) { rows.push({ id: name, page, status: "unreadable", error: error.message }); }
    }
    const unitRows = rows.filter(row => row.unit);
    for (const row of unitRows) {
      const counts = new Map();
      for (const other of unitRows) if (Math.abs(other.page - row.page) <= 20) counts.set(other.unit, (counts.get(other.unit) || 0) + 1);
      const sorted = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      if (sorted.length && sorted[0][0] !== row.unit) row.warnings.push(`unit ${row.unit} differs from nearby modal unit ${sorted[0][0]}; verify against the source chapter.`);
    }
    return { schemaVersion: 1, book, start, end, cards: rows, notice: "Read-only audit; not approval, accuracy or publication." };
  }
  return { init, packet, validate, submit, review, project, exportPack, audit, pageId, pageState, pageHistory, ensurePage, noCard };
}
if (require.main === module) {
  try {
    const [command, id, ...args] = process.argv.slice(2), work = createCardWork(); let result;
    if (command === "init" && args.length === 4) result = work.init(id, args[0], Number(args[1]), Number(args[2]), Number(args[3]));
    else if (["packet", "validate", "submit"].includes(command) && !args.length) result = work[command](id);
    else if (command === "review" && args.length === 3 && args[2] === "--permission-confirmed") result = work.review(id, args[0], args[1], true);
    else if (command === "export" && args.length === 1) result = work.exportPack(id, args[0]);
    else if (command === "audit") result = work.audit(id || "TB-01", args[0] ? Number(args[0]) : 1, args[1] ? Number(args[1]) : 99999);
    else throw new Error("Use init ID BOOK START END LIMIT | packet/validate/submit ID | audit [BOOK [START [END]]] | review ID HASH REVIEWER --permission-confirmed | export ID HASH");
    console.log(JSON.stringify(result, null, 2)); if (result.valid === false) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { createCardWork };
