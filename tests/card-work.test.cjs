const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), os = require("node:os");
const { createCardWork } = require("../scripts/card-work.cjs");
const card = () => ({ id: "synthetic-card", revision: 1, unit: "micro", topic: "Synthetic", title: "One point", headline: "An isolated synthetic knowledge point", summary: "This fixture is not textbook-derived content.", notes: "Only test state transitions and provenance boundaries.", takeaway: "", caution: "", related: [], sources: [{ id: "TB-01", page: 1 }], level: "unmapped", graphId: null });
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value));
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "econ-card-work-")); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const directory = path.join(root, "private-sources/ocr-work/TB-01/pages/00001"); fs.mkdirSync(directory, { recursive: true });
  const transcript = path.join(directory, "transcription.json"); write(transcript, { book_id: "TB-01", pdf_page: 1, status: "transcribed_needs_review", markdown: "Synthetic fixture." });
  const work = createCardWork(root); const packet = work.init("synthetic", "TB-01", 1, 2, 2);
  const draft = path.join(root, packet.draftPath), pack = { schemaVersion: 1, id: "synthetic", title: "Synthetic pack", cards: [card()] }; write(draft, pack);
  return { root, work, packet, draft, pack, transcript };
}
test("Accepted-page packets are bounded, resumable, and never rewrite transcripts", t => {
  const f = fixture(t), bytes = fs.readFileSync(f.transcript);
  assert.deepEqual(f.packet.manifest.unavailable, [2]);
  assert.equal(f.work.init("synthetic", "TB-01", 1, 2, 2).draftPath, f.packet.draftPath);
  assert.deepEqual(fs.readFileSync(f.transcript), bytes);
  assert.throws(() => f.work.init("synthetic", "TB-01", 1, 3, 2), /differs/);
  assert.throws(() => f.work.init("../escape", "TB-01", 1, 2, 2));
  assert.throws(() => f.work.init("too-many", "TB-01", 1, 31, 2));
});
test("Submit never publishes; explicit hash-bound operator selection is required", t => {
  const f = fixture(t), saved = f.work.submit("synthetic");
  assert.equal(saved.status, "submitted_needs_review"); assert.equal(fs.existsSync(path.join(f.root, "content")), false);
  assert.equal(f.work.submit("synthetic").contentHash, saved.contentHash);
  assert.throws(() => f.work.project("synthetic", saved.contentHash));
  assert.throws(() => f.work.review("synthetic", saved.contentHash, "Reviewer", false), /permission/);
  f.work.review("synthetic", saved.contentHash, "Synthetic operator", true);
  const projection = f.work.project("synthetic", saved.contentHash); assert.equal(projection.pack.cards.length, 1);
  assert.doesNotMatch(JSON.stringify(projection), /author-notes|transcription\.json|private-sources/);
  assert.equal(f.work.exportPack("synthetic", saved.contentHash).cards, 1);
  assert.throws(() => f.work.project("synthetic", "../../secret"), /Exact submission hash/);
});
test("Revisions, source changes, unknown graphs and private-path leaks fail closed", t => {
  const f = fixture(t); f.work.submit("synthetic");
  f.pack.cards[0].notes = "Changed wording requires an explicit new content revision."; write(f.draft, f.pack);
  assert.throws(() => f.work.submit("synthetic"), /increase revision/);
  f.pack.cards[0].revision++; f.pack.cards[0].graphId = "unregistered"; write(f.draft, f.pack); assert.equal(f.work.validate("synthetic").valid, false);
  f.pack.cards[0].graphId = null; f.pack.cards[0].notes = "Do not publish private-sources/secret.pdf"; write(f.draft, f.pack);
  const saved = f.work.submit("synthetic"); f.work.review("synthetic", saved.contentHash, "Synthetic operator", true);
  assert.throws(() => f.work.project("synthetic", saved.contentHash), /Private file paths/);
  fs.appendFileSync(f.transcript, " "); assert.equal(f.work.validate("synthetic").valid, false);
});

test("recovery never treats an edited or stale submitted draft as complete", t => {
  const f = fixture(t);
  f.work.submit("synthetic");
  assert.equal(f.work.packet("synthetic").status, "submitted_needs_review");
  const notes = path.join(f.root, f.packet.evidencePath);
  const previous = fs.readFileSync(notes);
  const changed = JSON.parse(previous); changed.concerns.push("A newly discovered unresolved concern."); write(notes, changed);
  assert.equal(f.work.packet("synthetic").status, "draft");
  fs.writeFileSync(notes, previous);
  fs.appendFileSync(f.transcript, " ");
  assert.equal(f.work.packet("synthetic").status, "draft");
});

test("authoring packets expose bounded nearby immutable coverage without changing completion", t => {
  const f = fixture(t); f.work.submit("synthetic");
  const next = f.work.ensurePage("TB-01", 1);
  assert.equal(next.nearbyCoverage.cards.length, 1);
  assert.equal(next.nearbyCoverage.cards[0].id, "synthetic-card");
  assert.equal(next.nearbyCoverage.cards[0].unit, "micro");
  assert.equal(next.nearbyCoverage.cards[0].topic, "Synthetic");
  assert.equal(next.nearbyCoverage.cards[0].level, "unmapped");
  assert.equal(next.nearbyCoverage.cards[0].status, "private_submission_not_approval");
  assert.equal(next.unitHint.unit, "micro");
  assert.equal(next.schemaExample.unit, "micro");
  assert.equal(next.nearbyCoverage.truncated, false);
  assert.equal(f.work.pageState("TB-01", 1).status, "draft");
  assert.equal(f.work.packet("synthetic").status, "submitted_needs_review");
  const before = fs.readFileSync(f.draft);
  const notes = path.join(f.root, "private-sources/card-work/synthetic/author-notes.json");
  fs.writeFileSync(notes, "{truncated");
  assert.equal(f.work.packet(next.id).nearbyCoverage.cards[0].id, "synthetic-card", "Historical submitted coverage is a hint, not current review approval");
  assert.deepEqual(fs.readFileSync(f.draft), before);
  const manifest = path.join(f.root, "private-sources/card-work/synthetic/manifest.json");
  fs.appendFileSync(manifest, " ");
  const warned = f.work.packet(next.id).nearbyCoverage;
  assert.equal(warned.cards.length, 0);
  assert.equal(warned.warnings[0].batchId, "synthetic");
});

test("validation surfaces universal and forward-reference warnings without blocking submission", t => {
  const f = fixture(t);
  f.pack.cards[0].headline = "Every market always clears.";
  f.pack.cards[0].notes = "The later PPC shows this.";
  write(f.draft, f.pack);
  const result = f.work.validate("synthetic");
  assert.equal(result.valid, true);
  assert.ok(result.warnings.some(w => /universal claim/.test(w)));
  assert.ok(result.warnings.some(w => /forward reference/.test(w)));
});

test("read-only audit lists current submissions, no-card pages, stale status and unit drift", t => {
  const f = fixture(t);
  const p1 = f.work.ensurePage("TB-01", 1);
  write(path.join(f.root, p1.draftPath), { schemaVersion: 1, id: p1.id, title: "Synthetic point",
    cards: [{ ...card(), id: "p1-test-point", sources: [{ id: "TB-01", page: 1 }] }] });
  f.work.submit(p1.id);

  const page2 = "private-sources/ocr-work/TB-01/pages/00002/transcription.json";
  fs.mkdirSync(path.dirname(path.join(f.root, page2)), { recursive: true });
  write(path.join(f.root, page2), { book_id: "TB-01", pdf_page: 2, status: "transcribed_needs_review" });
  f.work.noCard("TB-01", 2, "front_matter", "Synthetic page 2 contains only front matter and no economics knowledge point.");

  const page3 = "private-sources/ocr-work/TB-01/pages/00003/transcription.json";
  fs.mkdirSync(path.dirname(path.join(f.root, page3)), { recursive: true });
  write(path.join(f.root, page3), { book_id: "TB-01", pdf_page: 3, status: "transcribed_needs_review" });
  const p3 = f.work.ensurePage("TB-01", 3);
  write(path.join(f.root, p3.draftPath), { schemaVersion: 1, id: p3.id, title: "Synthetic point",
    cards: [{ ...card(), id: "p3-test-point", unit: "intro", sources: [{ id: "TB-01", page: 3 }] }] });
  f.work.submit(p3.id);

  const dir1 = path.join(f.root, "private-sources/card-work/ocr-tb-01-p00001-cards");
  const notesPath = path.join(f.root, p1.evidencePath);
  const before = {
    draft: fs.readFileSync(path.join(f.root, p1.draftPath)),
    notes: fs.readFileSync(notesPath),
    manifest: fs.readFileSync(path.join(dir1, "manifest.json")),
    submissions: fs.readdirSync(path.join(dir1, "submissions")).sort()
      .map(name => [name, fs.readFileSync(path.join(dir1, "submissions", name)).toString("base64")]),
  };
  const audit = f.work.audit("TB-01", 1, 3);
  assert.equal(audit.cards.length, 3);
  const row1 = audit.cards.find(row => row.page === 1);
  assert.equal(row1.status, "submitted_needs_review");
  assert.ok(row1.warnings.some(w => /unit micro differs from nearby modal unit intro/.test(w)));
  const row2 = audit.cards.find(row => row.page === 2);
  assert.equal(row2.status, "no_card_needed");
  assert.equal(row2.kind, "front_matter");
  assert.deepEqual(fs.readFileSync(path.join(f.root, p1.draftPath)), before.draft);
  assert.deepEqual(fs.readFileSync(notesPath), before.notes);
  assert.deepEqual(fs.readFileSync(path.join(dir1, "manifest.json")), before.manifest);
  assert.deepEqual(fs.readdirSync(path.join(dir1, "submissions")).sort()
    .map(name => [name, fs.readFileSync(path.join(dir1, "submissions", name)).toString("base64")]), before.submissions);
  assert.equal(fs.existsSync(path.join(f.root, "content")), false);

  fs.appendFileSync(path.join(f.root, page2), " ");
  const staleNoCard = f.work.audit("TB-01", 1, 3).cards.find(row => row.page === 2);
  assert.equal(staleNoCard.status, "stale_no_card");

  const changed = JSON.parse(before.notes);
  changed.concerns.push("Synthetic stale audit check.");
  fs.writeFileSync(notesPath, JSON.stringify(changed));
  const stale = f.work.audit("TB-01", 1, 3).cards.find(row => row.page === 1);
  assert.equal(stale.status, "stale_submission");
});

test("nearby coverage caps context at twelve cards and excludes distant page ranges", t => {
  const f = fixture(t);
  for (let i = 0; i < 13; i++) {
    const id = `nearby-${i}`, p = f.work.init(id, "TB-01", 1, 1, 1);
    write(path.join(f.root, p.draftPath), { schemaVersion: 1, id, title: "Synthetic nearby pack", cards: [{ ...card(), id: `nearby-point-${i}` }] });
    f.work.submit(id);
  }
  const p = f.work.ensurePage("TB-01", 1);
  assert.equal(p.nearbyCoverage.cards.length, 12);
  assert.equal(p.nearbyCoverage.truncated, true);
  const directory = path.join(f.root, "private-sources/ocr-work/TB-01/pages/00032");
  fs.mkdirSync(directory, { recursive: true });
  write(path.join(directory, "transcription.json"), { book_id: "TB-01", pdf_page: 32, status: "transcribed_needs_review" });
  assert.deepEqual(f.work.ensurePage("TB-01", 32).nearbyCoverage.cards, []);
});
