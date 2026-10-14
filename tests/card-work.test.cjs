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
