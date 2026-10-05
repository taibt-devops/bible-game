import { test } from "node:test";
import assert from "node:assert/strict";
import {
  splitWords, wordParts, normalizeWord, stripDiacritics, matchCase, blankCount, chooseBlanks,
  buildWordPool, pickDistractors, chunkVerse, scramble, correctPrefix, hintTokens, gradeRecall,
} from "../src/lib/text.js";
import { mulberry32 } from "../src/lib/random.js";
import { VERSES } from "../src/data/verses.js";

const john316 = VERSES.find((v) => v.id === "john-3-16").text;

test("wordParts tách dấu câu ở hai đầu", () => {
  assert.deepEqual(wordParts("gian,"), { lead: "", core: "gian", trail: "," });
  assert.deepEqual(wordParts("“Lời"), { lead: "“", core: "Lời", trail: "" });
  assert.equal(wordParts("Giê-hô-va.").core, "Giê-hô-va");
});

test("normalizeWord: chữ thường, bỏ dấu câu, chế độ không dấu", () => {
  assert.equal(normalizeWord("Đức,"), "đức");
  assert.equal(normalizeWord("Đức,", { lenient: true }), "duc");
  assert.equal(stripDiacritics("Thế gian đời đời"), "The gian doi doi");
});

test("matchCase theo chữ hoa của đáp án", () => {
  assert.equal(matchCase("thương", "Ngài"), "Thương");
  assert.equal(matchCase("thương", "ngài"), "thương");
});

test("blankCount theo độ khó và độ dài", () => {
  assert.equal(blankCount(10, 1), 1);
  assert.equal(blankCount(33, 1), 2);
  assert.equal(blankCount(20, 3), 3);
  assert.equal(blankCount(40, 3), 4);
});

test("chooseBlanks: đủ số ô, không sát nhau, không chọn hư từ khi còn từ khác", () => {
  const words = splitWords(john316);
  for (let s = 1; s < 30; s++) {
    const b = chooseBlanks(words, 3, mulberry32(s));
    assert.equal(b.length, 3);
    for (let i = 1; i < b.length; i++) assert.ok(b[i] - b[i - 1] > 1);
    for (const i of b) assert.ok(!["và", "là", "của", "mà"].includes(normalizeWord(words[i])));
  }
});

test("pickDistractors: 3 từ khác đáp án và khác từ trong câu", () => {
  const pool = buildWordPool(VERSES);
  const words = splitWords(john316);
  for (let s = 1; s < 20; s++) {
    const d = pickDistractors("thương", pool, words, 3, mulberry32(s));
    assert.equal(d.length, 3);
    assert.equal(new Set(d).size, 3);
    const inVerse = new Set(words.map((w) => normalizeWord(w)));
    for (const w of d) assert.ok(!inVerse.has(w), w);
  }
});

test("chunkVerse: số mảnh theo độ khó và ghép lại đúng câu", () => {
  for (const v of VERSES) {
    for (const level of [1, 2, 3]) {
      const c = chunkVerse(v.text, level);
      assert.equal(c.join(" "), splitWords(v.text).join(" "), `${v.id} L${level}`);
      if (level === 1) assert.ok(c.length >= 3 && c.length <= 4, `${v.id} L1 = ${c.length}`);
      if (level === 2) assert.ok(c.length >= 3 && c.length <= 7, `${v.id} L2 = ${c.length}`);
      if (level === 3) assert.ok(c.length >= 3 && c.length <= 11, `${v.id} L3 = ${c.length}`);
    }
  }
});

test("scramble không bao giờ giữ nguyên thứ tự", () => {
  const chunks = ["a b", "c d", "e f"];
  for (let s = 1; s < 50; s++) {
    const out = scramble(chunks, mulberry32(s)).map((x) => x.text);
    assert.notDeepEqual(out, chunks);
    assert.deepEqual([...out].sort(), [...chunks].sort());
  }
});

test("correctPrefix", () => {
  assert.equal(correctPrefix(["a", "b", "x"], ["a", "b", "c"]), 2);
  assert.equal(correctPrefix([], ["a"]), 0);
});

test("hintTokens theo độ khó", () => {
  assert.deepEqual(hintTokens("Lời Chúa là ngọn đèn,", 1), ["L", "C", "l", "n", "đ,"]);
  assert.deepEqual(hintTokens("Lời Chúa,", 2), ["L", "C"]);
  assert.deepEqual(hintTokens("Lời Chúa,", 3), ["＿", "＿"]);
});

test("gradeRecall: đúng hết, thiếu từ, thừa từ, không dấu", () => {
  const t = "Lời Chúa là ngọn đèn cho chơn tôi, Ánh sáng cho đường lối tôi.";
  assert.equal(gradeRecall(t, "lời chúa là ngọn đèn cho chơn tôi ánh sáng cho đường lối tôi").score, 1);
  const half = gradeRecall(t, "Lời Chúa là ngọn đèn cho chơn tôi");
  assert.ok(half.score > 0.6 && half.score < 0.8);
  assert.equal(half.pass, false);
  const doubled = gradeRecall(t, t + " " + t);
  assert.ok(doubled.score < 0.7, "gõ lặp hai lần không được điểm cao");
  assert.ok(gradeRecall(t, "Loi Chua la ngon den cho chon toi anh sang cho duong loi toi", { lenient: true }).pass);
  assert.equal(gradeRecall(t, "Loi Chua la ngon den cho chon toi anh sang cho duong loi toi").pass, false);
  assert.equal(gradeRecall(t, "").score, 0);
});
