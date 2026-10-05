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
  assert.equal(s.streak, 3);
  assert.equal(s.settings.sound, false);
  assert.equal(s.v, 2);
});

test("bổ sung trường mới khi đọc bản v2 thiếu trường", () => {
  const s = migrate({ v: 2, xp: 5, settings: { sound: false } });
  assert.equal(s.settings.sound, false);
  assert.equal(s.settings.dailyGoal, 50);
  assert.deepEqual(s.stats, defaultState().stats);
});

test("update lưu xuống storage và báo listener; reset", () => {
  const mem = memory();
  const store = createStore(mem);
  let calls = 0;
  store.subscribe(() => calls++);
  store.update((s) => { s.xp = 42; });
  assert.equal(JSON.parse(mem.dump.get(STORAGE_KEY)).xp, 42);
  store.reset();
  assert.equal(store.get().xp, 0);
  assert.equal(calls, 2);
});
