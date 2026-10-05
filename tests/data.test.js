import { test } from "node:test";
import assert from "node:assert/strict";
import { VERSES, TOPICS } from "../src/data/verses.js";

test("dữ liệu câu gốc hợp lệ", () => {
  const ids = new Set();
  const topics = new Set(TOPICS.map((t) => t.id));
  for (const v of VERSES) {
    assert.ok(!ids.has(v.id), `trùng id ${v.id}`);
    ids.add(v.id);
    assert.ok(topics.has(v.topic), `${v.id}: chủ đề lạ ${v.topic}`);
    assert.match(v.ref, /^.+ \d+:\d+(-\d+)?$/);
    assert.ok(v.text.length > 10);
    assert.ok(!/[Ðð]/.test(v.text), `${v.id}: còn ký tự Ð`);
    assert.match(v.text, /^\p{Lu}/u, `${v.id}: chưa viết hoa đầu câu`);
    assert.match(v.text, /[.?!]$/, `${v.id}: thiếu dấu kết câu`);
    assert.equal(v.words, v.text.split(/\s+/).length);
  }
  for (const t of TOPICS) assert.ok(VERSES.filter((v) => v.topic === t.id).length >= 5, `${t.id} có ít hơn 5 câu`);
});
