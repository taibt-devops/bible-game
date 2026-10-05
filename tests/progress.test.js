import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dayStr, addDays, dayDiff, levelInfo, applyXp, currentStreak, reviewVerse, verseStatus, isDue,
  pickRound, reviewQueue, verseOfDay, roundStars, earnedBadges,
} from "../src/lib/progress.js";
import { defaultState } from "../src/lib/store.js";
import { mulberry32 } from "../src/lib/random.js";
import { VERSES, TOPICS } from "../src/data/verses.js";

test("ngày theo giờ địa phương và cộng trừ ngày", () => {
  assert.equal(dayStr(new Date(2026, 0, 5, 23, 30)), "2026-01-05");
  assert.equal(addDays("2026-02-27", 2), "2026-03-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(dayDiff("2026-03-30", "2026-04-02"), 3);
});

test("levelInfo: 100 XP lên cấp 2, thêm 150 XP lên cấp 3", () => {
  assert.deepEqual(levelInfo(0), { level: 1, into: 0, need: 100 });
  assert.deepEqual(levelInfo(100), { level: 2, into: 0, need: 150 });
  assert.deepEqual(levelInfo(260), { level: 3, into: 10, need: 200 });
});

test("applyXp: chuỗi ngày, kỷ lục, mục tiêu ngày, lên cấp", () => {
  const s = defaultState();
  let r = applyXp(s, 30, "2026-10-01");
  assert.equal(s.streak, 1);
  assert.equal(r.goalReached, false);
  r = applyXp(s, 30, "2026-10-01");
  assert.equal(r.goalReached, true);
  assert.equal(s.streak, 1);
  applyXp(s, 10, "2026-10-02");
  assert.equal(s.streak, 2);
  assert.equal(currentStreak(s, "2026-10-03"), 2);
  assert.equal(currentStreak(s, "2026-10-04"), 0);
  r = applyXp(s, 50, "2026-10-05");
  assert.equal(s.streak, 1);
  assert.equal(s.bestStreak, 2);
  assert.equal(r.leveledUp, true);
  assert.equal(s.today.xp, 50);
});

test("reviewVerse: lên hộp 1 lần/ngày, xuống hộp khi sai, hạn ôn", () => {
  let e = reviewVerse(undefined, true, "2026-10-01");
  assert.equal(e.box, 1);
  assert.equal(e.due, "2026-10-02");
  e = reviewVerse(e, true, "2026-10-01");
  assert.equal(e.box, 1, "cùng ngày không lên thêm");
  e = reviewVerse(e, true, "2026-10-02");
  assert.equal(e.box, 2);
  assert.equal(e.due, "2026-10-04");
  e = reviewVerse(e, false, "2026-10-04");
  assert.equal(e.box, 1);
  assert.equal(e.due, "2026-10-04");
  assert.equal(verseStatus(e), "learning");
  assert.equal(verseStatus({ box: 4 }), "learned");
  assert.equal(verseStatus(undefined), "new");
  assert.ok(isDue(e, "2026-10-04"));
});

test("pickRound ưu tiên câu đến hạn rồi câu mới, lọc chủ đề", () => {
  const vs = { "john-3-16": { box: 2, due: "2026-10-01" }, "romans-5-8": { box: 3, due: "2026-12-01" } };
  const r = pickRound(VERSES, vs, { count: 3, topic: "love", today: "2026-10-05", rnd: mulberry32(1) });
  assert.equal(r.length, 3);
  assert.equal(r[0].id, "john-3-16");
  assert.ok(r.every((v) => v.topic === "love"));
  assert.ok(!r.slice(1).some((v) => v.id === "romans-5-8"), "câu chưa đến hạn đứng sau câu mới");
  assert.deepEqual(pickRound(VERSES, {}, { count: 6, onlyId: "john-3-16" }).map((v) => v.id), ["john-3-16"]);
});

test("reviewQueue: đến hạn trước, không có thì lấy câu mới", () => {
  const q1 = reviewQueue(VERSES, { "john-3-16": { box: 1, due: "2026-10-01" } }, "2026-10-05");
  assert.equal(q1.kind, "due");
  assert.deepEqual(q1.list.map((v) => v.id), ["john-3-16"]);
  const q2 = reviewQueue(VERSES, {}, "2026-10-05");
  assert.equal(q2.kind, "new");
  assert.equal(q2.list.length, 5);
});

test("verseOfDay cố định theo ngày và không lặp trong một chu kỳ", () => {
  assert.equal(verseOfDay(VERSES, "2026-10-05").id, verseOfDay(VERSES, "2026-10-05").id);
  const seen = new Set();
  const start = VERSES.length * 400;
  for (let i = 0; i < VERSES.length; i++) {
    const day = new Date((start + i) * 864e5).toISOString().slice(0, 10);
    seen.add(verseOfDay(VERSES, day).id);
  }
  assert.equal(seen.size, VERSES.length);
});

test("roundStars", () => {
  assert.equal(roundStars(6, 6), 3);
  assert.equal(roundStars(5, 6), 2);
  assert.equal(roundStars(3, 6), 1);
  assert.equal(roundStars(2, 6), 0);
});

test("earnedBadges", () => {
  const s = defaultState();
  assert.deepEqual(earnedBadges(s, VERSES, TOPICS), []);
  s.stats.rounds = 1;
  s.bestStreak = 7;
  for (const v of VERSES.filter((v) => v.topic === "love")) s.verses[v.id] = { box: 4 };
  const got = earnedBadges(s, VERSES, TOPICS);
  for (const id of ["first-round", "streak-3", "streak-7", "learned-5", "topic-master"]) assert.ok(got.includes(id), id);
  assert.ok(!got.includes("streak-30"));
});
