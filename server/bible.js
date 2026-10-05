// Toàn bộ Kinh Thánh 1934 cho nhóm trưởng chọn câu gốc tuần (dữ liệu sinh bởi scripts/extract_verses.py).
import fs from "node:fs";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { VERSES } from "../src/data/verses.js";

const DEFAULT_FILE = fileURLToPath(new URL("./data/vi1934.json.gz", import.meta.url));
export const MAX_PASSAGE = 5;

function tidy(text) {
  return (text[0].toUpperCase() + text.slice(1)).replace(/[,;:]$/, ".");
}

export function loadBible(file = DEFAULT_FILE) {
  const data = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString("utf8"));
  const books = data.books;
  const bySlug = new Map(books.map((b) => [b.slug, b]));
  const curated = new Map(VERSES.map((v) => [v.id, v]));

  function passage(bookNo, chapter, from, to = from) {
    const b = books[bookNo - 1];
    if (!b) return null;
    const ch = b.chapters[chapter - 1];
    if (!ch || !(from >= 1) || !(to >= from) || to > ch.length || to - from + 1 > MAX_PASSAGE) return null;
    const span = from === to ? `${from}` : `${from}-${to}`;
    const id = `${b.slug}-${chapter}-${span}`;
    const known = curated.get(id);
    if (known) return { id, ref: known.ref, text: known.text, words: known.words };
    const text = tidy(ch.slice(from - 1, to).join(" "));
    return { id, ref: `${b.name} ${chapter}:${span}`, text, words: text.split(/\s+/).length };
  }

  // Đọc id dạng "john-3-16" hoặc "i-john-4-7-8".
  function byId(id) {
    if (curated.has(id)) return { ...curated.get(id) };
    const m = /^([a-z-]+?)-(\d+)-(\d+)(?:-(\d+))?$/.exec(String(id));
    if (!m) return null;
    const b = bySlug.get(m[1]);
    if (!b) return null;
    return passage(b.n, Number(m[2]), Number(m[3]), m[4] ? Number(m[4]) : Number(m[3]));
  }

  const bookList = books.map((b) => ({ n: b.n, name: b.name, chapters: b.chapters.map((c) => c.length) }));

  return { passage, byId, books: bookList, isVerseId: (id) => !!byId(id) };
}
