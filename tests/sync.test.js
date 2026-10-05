import { test } from "node:test";
import assert from "node:assert/strict";
import { makeEvent, validateEvent, pendingTotals, mergeVerses, mergeBadges, mergeDays, applySyncResponse } from "../src/lib/sync.js";
import { defaultState } from "../src/lib/store.js";

const ev = (o = {}) => makeEvent({ id: "ev-000001", day: "2026-10-05", at: 1, xp: 50, kind: "round", mode: "fill", ...o });

test("validateEvent", () => {
  assert.equal(validateEvent(ev(), "2026-10-05"), null);
  assert.match(validateEvent(ev({ xp: 999 }), "2026-10-05"), /XP/);
  assert.match(validateEvent(ev({ day: "2026-01-01" }), "2026-10-05"), /cũ/);
  assert.match(validateEvent(ev({ day: "2026-10-09" }), "2026-10-05"), /tương lai/);
  assert.equal(validateEvent(ev({ day: "2026-10-06" }), "2026-10-05"), null, "lệch múi giờ 1 ngày vẫn nhận");
  assert.match(validateEvent(ev({ id: "x" }), "2026-10-05"), /id/);
  assert.match(validateEvent(ev({ kind: "hack" }), "2026-10-05"), /loại/);
  assert.equal(validateEvent(ev({ kind: "import", xp: 4000, day: "2025-01-01" }), "2026-10-05"), null);
  assert.match(validateEvent({ ...ev(), rounds: 5 }, "2026-10-05"), /rounds/);
});

test("pendingTotals", () => {
  const t = pendingTotals([ev(), ev({ id: "ev-000002", xp: 5, kind: "flash", day: "2026-10-04" }), ev({ id: "ev-000003", perfect: true, votd: true })], "2026-10-05");
  assert.deepEqual(t, { xp: 105, rounds: 2, perfect: 1, votd: 1, dayXp: 100 });
});

test("gộp câu: bản mới nhất thắng; huy hiệu lấy ngày sớm nhất; ngày học lấy hợp", () => {
  const a = { x: { box: 3, at: 10, seen: 5 }, y: { box: 1, at: 5 } };
  const b = { x: { box: 1, at: 20, seen: 6 }, z: { box: 2, at: 1 } };
  assert.deepEqual(mergeVerses(a, b), { x: b.x, y: a.y, z: b.z });
  assert.deepEqual(mergeBadges({ p: "2026-10-05" }, { p: "2026-10-01", q: "2026-10-02" }), { p: "2026-10-01", q: "2026-10-02" });
  assert.deepEqual(mergeDays(["2026-10-02", "2026-10-01"], ["2026-10-02", "2026-10-03"]), ["2026-10-01", "2026-10-02", "2026-10-03"]);
});

test("applySyncResponse: bỏ sự kiện đã gửi, giữ sự kiện mới phát sinh, cộng đúng XP", () => {
  const s = defaultState();
  const sent = ev();
  const late = ev({ id: "ev-000009", xp: 20 });
  s.sync.pending = [sent, late];
  s.verses = { local: { box: 1, at: 99 } };
  applySyncResponse(s, {
    xp: 500, dayXp: 120, bestStreak: 6,
    stats: { rounds: 10, perfectRounds: 2, votdCount: 3, votdDone: "2026-10-05" },
    verses: { remote: { box: 4, at: 50 } }, badges: { perfect: "2026-10-01" }, days: ["2026-10-04", "2026-10-05"],
  }, [sent.id], "2026-10-05");
  assert.deepEqual(s.sync.pending.map((e) => e.id), [late.id]);
  assert.equal(s.xp, 520);
  assert.equal(s.today.xp, 140);
  assert.equal(s.stats.rounds, 11);
  assert.equal(s.stats.votdDone, "2026-10-05");
  assert.deepEqual(Object.keys(s.verses).sort(), ["local", "remote"]);
  assert.equal(s.bestStreak, 6);
  assert.deepEqual(s.days, ["2026-10-04", "2026-10-05"]);
});
