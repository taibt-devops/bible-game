// Xử lý văn bản câu gốc: tách từ, chuẩn hoá, chọn ô trống, cắt mảnh, chấm điểm.
// Module thuần (không đụng DOM) để chạy được trong node --test.
import { shuffle } from "./random.js";

const EDGE = /^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u;

// Hư từ: ít nghĩa, không nên làm ô trống.
export const STOPWORDS = new Set([
  "và", "là", "của", "cho", "thì", "mà", "các", "những", "một", "với", "trong", "đã", "sẽ", "có",
  "không", "chẳng", "ấy", "nầy", "này", "vì", "hãy", "đều", "được", "bởi", "nơi", "ra", "đến", "lại",
  "cùng", "rằng", "nào", "ai", "chi", "khi", "như", "đó", "để", "hầu", "bèn", "vả", "nếu", "ta", "tôi",
  "ngươi", "con", "người", "mình", "chúng", "anh", "em", "họ", "từ", "sự", "điều", "kẻ", "ở", "vậy",
]);

export const splitWords = (text) => text.trim().split(/\s+/).filter(Boolean);

export function wordParts(token) {
  const [, lead, core, trail] = token.match(EDGE);
  return { lead, core, trail };
}

export function stripDiacritics(s) {
  return s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D").normalize("NFC");
}

export function normalizeWord(token, { lenient = false } = {}) {
  let s = wordParts(token).core.normalize("NFC").toLowerCase();
  if (lenient) s = stripDiacritics(s);
  return s;
}

export function matchCase(word, model) {
  if (!word || !model) return word;
  const first = model[0];
  return first !== first.toLowerCase() ? word[0].toUpperCase() + word.slice(1) : word;
}

/* ---------- Điền Từ ---------- */

export function blankCount(wordCount, level) {
  return Math.max(1, Math.min(4, level + (wordCount > 32 ? 1 : 0)));
}

// Chọn vị trí ô trống: ưu tiên từ có nghĩa, không đặt hai ô sát nhau.
export function chooseBlanks(words, count, rnd = Math.random) {
  const usable = words.map((w, i) => ({ i, n: normalizeWord(w) })).filter((x) => x.n.length >= 2);
  const strong = shuffle(usable.filter((x) => !STOPWORDS.has(x.n)), rnd);
  const weak = shuffle(usable.filter((x) => STOPWORDS.has(x.n)), rnd);
  const picked = [];
  for (const relax of [false, true]) {
    for (const { i } of [...strong, ...weak]) {
      if (picked.length >= count) break;
      if (picked.includes(i)) continue;
      if (!relax && picked.some((p) => Math.abs(p - i) <= 1 || normalizeWord(words[p]) === normalizeWord(words[i]))) continue;
      picked.push(i);
    }
  }
  return picked.sort((a, b) => a - b);
}

export function buildWordPool(verses) {
  const pool = new Set();
  for (const v of verses) {
    for (const w of splitWords(v.text)) {
      const n = normalizeWord(w);
      if (n.length >= 2 && !STOPWORDS.has(n)) pool.add(n);
    }
  }
  return [...pool];
}

// 3 từ gây nhiễu: gần độ dài, cùng kiểu có/không gạch nối, không trùng từ trong câu.
export function pickDistractors(answer, pool, exclude = [], count = 3, rnd = Math.random) {
  const ans = normalizeWord(answer);
  const banned = new Set([ans, ...exclude.map((w) => normalizeWord(w))]);
  const hyphen = ans.includes("-");
  const candidates = shuffle(pool.filter((w) => !banned.has(w)), rnd);
  const score = (w) => Math.abs(w.length - ans.length) + (w.includes("-") === hyphen ? 0 : 4);
  candidates.sort((a, b) => score(a) - score(b));
  const near = candidates.filter((w) => score(w) <= 2);
  const chosen = shuffle(near, rnd).slice(0, count);
  for (const w of candidates) {
    if (chosen.length >= count) break;
    if (!chosen.includes(w)) chosen.push(w);
  }
  return chosen;
}

/* ---------- Xếp Câu ---------- */

function phrases(text) {
  return text.split(/(?<=[,;:.?!])\s+/).map(splitWords).filter((p) => p.length);
}

function fitCount(groups, min, max) {
  const g = groups.map((p) => [...p]);
  while (g.length > max) {
    let best = 0;
    for (let i = 1; i < g.length - 1; i++) {
      if (g[i].length + g[i + 1].length < g[best].length + g[best + 1].length) best = i;
    }
    g.splice(best, 2, [...g[best], ...g[best + 1]]);
  }
  while (g.length < min) {
    let longest = -1;
    g.forEach((p, i) => { if (p.length >= 2 && (longest < 0 || p.length > g[longest].length)) longest = i; });
    if (longest < 0) break;
    const p = g[longest], mid = Math.ceil(p.length / 2);
    g.splice(longest, 1, p.slice(0, mid), p.slice(mid));
  }
  return g;
}

export function chunkVerse(text, level) {
  const words = splitWords(text);
  let groups;
  if (level >= 3) {
    const size = Math.max(2, Math.ceil(words.length / 10));
    groups = [];
    for (let i = 0; i < words.length; i += size) groups.push(words.slice(i, i + size));
    if (groups.length > 1 && groups[groups.length - 1].length === 1) groups[groups.length - 2].push(...groups.pop());
  } else {
    groups = phrases(text);
    for (let i = groups.length - 1; i > 0; i--) {
      if (groups[i].length < 2) groups.splice(i - 1, 2, [...groups[i - 1], ...groups[i]]);
    }
    if (level === 2) {
      // Cụm quá dài thì chia đôi để mỗi mảnh dễ nhận ra.
      for (let i = 0; i < groups.length; i++) {
        if (groups[i].length > 8) {
          const p = groups[i], mid = Math.ceil(p.length / 2);
          groups.splice(i, 1, p.slice(0, mid), p.slice(mid));
          i--;
        }
      }
    }
    groups = level <= 1 ? fitCount(groups, 3, 4) : fitCount(groups, 3, 7);
  }
  return groups.map((g) => g.join(" "));
}

// Xáo trộn nhưng không bao giờ trả về đúng thứ tự ban đầu.
export function scramble(chunks, rnd = Math.random) {
  const items = chunks.map((text, id) => ({ id, text }));
  if (new Set(chunks).size < 2) return items;
  for (let t = 0; t < 12; t++) {
    const s = shuffle(items, rnd);
    if (s.some((x, i) => x.text !== chunks[i])) return s;
  }
  return [...items.slice(1), items[0]];
}

// Số mảnh đúng vị trí liên tiếp tính từ đầu.
export function correctPrefix(answerTexts, chunks) {
  let p = 0;
  while (p < answerTexts.length && answerTexts[p] === chunks[p]) p++;
  return p;
}

/* ---------- Thuộc Lòng ---------- */

export function hintTokens(text, level) {
  return splitWords(text).map((w) => {
    const { lead, core, trail } = wordParts(w);
    const first = core ? [...core][0] : "";
    if (level <= 1) return lead + first + trail;
    if (level === 2) return first;
    return "＿";
  });
}

function lcs(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const hit = new Set();
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { hit.add(i); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return hit;
}

// Điểm = 2·LCS/(số từ đúng + số từ gõ). matched: chỉ số các từ trong câu gốc đã gõ đúng.
export function gradeRecall(target, typed, { lenient = false, pass = 0.9 } = {}) {
  const tokens = splitWords(target);
  const want = [];
  tokens.forEach((w, i) => { const n = normalizeWord(w, { lenient }); if (n) want.push({ i, n }); });
  const got = splitWords(typed).map((w) => normalizeWord(w, { lenient })).filter(Boolean);
  const hitIdx = lcs(want.map((x) => x.n), got);
  const matched = new Set([...hitIdx].map((k) => want[k].i));
  const total = want.length + got.length;
  const score = total ? (2 * hitIdx.size) / total : 0;
  return { score, matched, pass: score >= pass, typedWords: got.length, targetWords: want.length };
}
