import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore, migrate, defaultState, STORAGE_KEY } from "../src/lib/store.js";

function memory(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), dump: m };
}

test("trạng thái mặc định khi chưa có dữ liệu hoặc dữ liệu hỏng", () => {
  assert.deepEqual(createStore(memory()).get(), defaultState());
  assert.deepEqual(createStore(memory({ [STORAGE_KEY]: "{oops" })).get(), defaultState());
  assert.deepEqual(createStore(null).get(), defaultState());
});

test("chuyển đổi từ bản thử nghiệm manna.v1", () => {
  const s = createStore(memory({ "manna.v1": JSON.stringify({ name: "Hân", xp: 120, streak: 3, last: "2026-10-01", sound: false, mastered: { x: 2 } }) })).get();
  assert.equal(s.profile.name, "Hân");
  assert.equal(s.xp, 120);
  assert.deepEqual(s.days, ["2026-09-29", "2026-09-30", "2026-10-01"]);
  assert.equal(s.settings.sound, false);
  assert.equal(s.v, 3);
});

test("chuyển đổi v2 → v3: ngày học, sự kiện nhập XP, giữ câu đã học", () => {
  const v2 = { v: 2, xp: 340, streak: 2, bestStreak: 4, lastActive: "2026-10-05", verses: { "john-3-16": { box: 2, due: "2026-10-07" } }, settings: { sound: false } };
  const s = createStore(memory({ "manna.v2": JSON.stringify(v2) })).get();
  assert.equal(s.v, 3);
  assert.deepEqual(s.days, ["2026-10-04", "2026-10-05"]);
  assert.equal(s.bestStreak, 4);
  assert.equal(s.verses["john-3-16"].box, 2);
  assert.equal(s.sync.pending.length, 1);
  assert.equal(s.sync.pending[0].kind, "import");
  assert.equal(s.sync.pending[0].xp, 340);
  assert.equal(s.settings.sound, false);
  assert.equal(s.settings.dailyGoal, 50);
});

test("bổ sung trường mới khi đọc bản v3 thiếu trường", () => {
  const s = migrate({ v: 3, xp: 5, settings: { sound: false } });
  assert.equal(s.settings.sound, false);
  assert.equal(s.settings.dailyGoal, 50);
  assert.deepEqual(s.stats, defaultState().stats);
  assert.deepEqual(s.sync.pending, []);
});

test("update lưu xuống storage và báo listener; reset", () => {
  const mem = memory();
  const store = createStore(mem);
  let calls = 0;
  store.subscribe(() => calls++);
  store.update((s) => { s.xp = 42; });
  assert.equal(JSON.parse(mem.dump.get(STORAGE_KEY)).xp, 42);
  store.update((s) => { s.settings.sound = false; s.sync.deviceId = "dev1"; });
  store.reset();
  assert.equal(store.get().xp, 0);
  assert.equal(store.get().settings.sound, false, "đăng xuất giữ cài đặt");
  assert.equal(store.get().sync.deviceId, "dev1");
  assert.equal(calls, 3);
});
