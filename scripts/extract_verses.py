#!/usr/bin/env python3
"""Sinh src/data/verses.js từ Kinh Thánh Tiếng Việt 1934 (bản Cadman, phạm vi công cộng).

Nguồn: https://github.com/scrollmapper/bible_databases (formats/json/Viet.json)

Cách dùng:
    python3 scripts/extract_verses.py              # tải nguồn (lưu tạm ở scripts/.cache)
    python3 scripts/extract_verses.py path/Viet.json

Muốn thêm câu gốc: thêm một dòng vào VERSES rồi chạy lại script. Không sửa tay src/data/verses.js.
"""
import gzip
import json
import os
import re
import sys
import urllib.request

SOURCE_URL = "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/Viet.json"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "src", "data", "verses.js")
BIBLE_OUT = os.path.join(HERE, "..", "server", "data", "vi1934.json.gz")

TOPICS = [
    ("love", "Tình yêu"),
    ("faith", "Đức tin"),
    ("peace", "Bình an"),
    ("courage", "Can đảm"),
    ("hope", "Hy vọng"),
    ("word", "Lời Chúa"),
    ("youth", "Tuổi trẻ"),
    ("salvation", "Ơn cứu rỗi"),
    ("life", "Sống đẹp"),
]

# Tên 66 sách theo bản Truyền Thống, theo thứ tự trong nguồn.
BOOK_NAMES_VI = [
    "Sáng Thế Ký", "Xuất Ê-díp-tô Ký", "Lê-vi Ký", "Dân Số Ký", "Phục Truyền Luật Lệ Ký", "Giô-suê",
    "Các Quan Xét", "Ru-tơ", "1 Sa-mu-ên", "2 Sa-mu-ên", "1 Các Vua", "2 Các Vua", "1 Sử Ký", "2 Sử Ký",
    "E-xơ-ra", "Nê-hê-mi", "Ê-xơ-tê", "Gióp", "Thi Thiên", "Châm Ngôn", "Truyền Đạo", "Nhã Ca", "Ê-sai",
    "Giê-rê-mi", "Ca Thương", "Ê-xê-chi-ên", "Đa-ni-ên", "Ô-sê", "Giô-ên", "A-mốt", "Áp-đia", "Giô-na",
    "Mi-chê", "Na-hum", "Ha-ba-cúc", "Sô-phô-ni", "A-ghê", "Xa-cha-ri", "Ma-la-chi",
    "Ma-thi-ơ", "Mác", "Lu-ca", "Giăng", "Công Vụ", "Rô-ma", "1 Cô-rinh-tô", "2 Cô-rinh-tô", "Ga-la-ti",
    "Ê-phê-sô", "Phi-líp", "Cô-lô-se", "1 Tê-sa-lô-ni-ca", "2 Tê-sa-lô-ni-ca", "1 Ti-mô-thê", "2 Ti-mô-thê",
    "Tít", "Phi-lê-môn", "Hê-bơ-rơ", "Gia-cơ", "1 Phi-e-rơ", "2 Phi-e-rơ", "1 Giăng", "2 Giăng", "3 Giăng",
    "Giu-đe", "Khải Huyền",
]

# (chủ đề, sách trong nguồn, chương, câu đầu, câu cuối)
VERSES = [
    ("love", "John", 3, 16, 16), ("love", "Romans", 5, 8, 8), ("love", "I John", 4, 19, 19),
    ("love", "I John", 4, 7, 7), ("love", "John", 13, 34, 34), ("love", "I Corinthians", 13, 4, 4),
    ("faith", "Hebrews", 11, 1, 1), ("faith", "Proverbs", 3, 5, 6), ("faith", "Ephesians", 2, 8, 8),
    ("faith", "Matthew", 6, 33, 33), ("faith", "John", 14, 6, 6), ("faith", "Hebrews", 11, 6, 6),
    ("peace", "Psalms", 23, 1, 1), ("peace", "Matthew", 11, 28, 28), ("peace", "Philippians", 4, 6, 6),
    ("peace", "Philippians", 4, 7, 7), ("peace", "John", 14, 27, 27), ("peace", "Isaiah", 26, 3, 3),
    ("peace", "I Peter", 5, 7, 7),
    ("courage", "Joshua", 1, 9, 9), ("courage", "Isaiah", 41, 10, 10), ("courage", "Philippians", 4, 13, 13),
    ("courage", "II Timothy", 1, 7, 7), ("courage", "Psalms", 27, 1, 1), ("courage", "Deuteronomy", 31, 6, 6),
    ("hope", "Jeremiah", 29, 11, 11), ("hope", "Romans", 8, 28, 28), ("hope", "Isaiah", 40, 31, 31),
    ("hope", "Romans", 15, 13, 13), ("hope", "Lamentations", 3, 22, 23),
    ("word", "Psalms", 119, 105, 105), ("word", "Psalms", 119, 11, 11), ("word", "II Timothy", 3, 16, 16),
    ("word", "Hebrews", 4, 12, 12), ("word", "Joshua", 1, 8, 8), ("word", "Matthew", 4, 4, 4),
    ("youth", "I Timothy", 4, 12, 12), ("youth", "Psalms", 119, 9, 9), ("youth", "Ecclesiastes", 12, 1, 1),
    ("youth", "II Timothy", 2, 22, 22), ("youth", "Proverbs", 1, 7, 7),
    ("salvation", "Romans", 3, 23, 23), ("salvation", "Romans", 6, 23, 23), ("salvation", "Acts", 4, 12, 12),
    ("salvation", "I John", 1, 9, 9), ("salvation", "II Corinthians", 5, 17, 17),
    ("salvation", "Revelation of John", 3, 20, 20), ("salvation", "Romans", 10, 9, 9),
    ("life", "Galatians", 5, 22, 23), ("life", "Micah", 6, 8, 8), ("life", "Matthew", 5, 16, 16),
    ("life", "Colossians", 3, 23, 23), ("life", "Ephesians", 4, 32, 32), ("life", "Matthew", 7, 12, 12),
]

# Lỗi đã biết trong bản số hoá: (id, chuỗi sai, chuỗi đúng)
FIXES = [
    ("psalms-119-9", "Ngươi trẻ tuổi", "Người trẻ tuổi"),
]


def load_source(path=None):
    if path:
        with open(path, encoding="utf-8-sig") as f:
            return json.load(f)
    cache = os.path.join(HERE, ".cache", "Viet.json")
    if not os.path.exists(cache):
        os.makedirs(os.path.dirname(cache), exist_ok=True)
        print("Đang tải", SOURCE_URL)
        urllib.request.urlretrieve(SOURCE_URL, cache)
    with open(cache, encoding="utf-8-sig") as f:
        return json.load(f)


def clean(text):
    text = text.replace("Ð", "Đ").replace("ð", "đ")  # Ð/ð → Đ/đ
    return re.sub(r"\s+", " ", text).strip()


def tidy_excerpt(text):
    text = text[0].upper() + text[1:]
    return re.sub(r"[,;:]$", ".", text)


def slug(*parts):
    return re.sub(r"[^a-z0-9]+", "-", " ".join(str(p) for p in parts).lower()).strip("-")


def main():
    data = load_source(sys.argv[1] if len(sys.argv) > 1 else None)
    assert len(data["books"]) == 66
    names_vi = {b["name"]: BOOK_NAMES_VI[i] for i, b in enumerate(data["books"])}
    books = {b["name"]: b for b in data["books"]}
    fixes = {f[0]: f[1:] for f in FIXES}
    out, seen = [], set()
    for topic, book, ch, v1, v2 in VERSES:
        verses = books[book]["chapters"][ch - 1]["verses"]
        text = " ".join(clean(v["text"]) for v in verses if v1 <= v["verse"] <= v2)
        span = f"{v1}" if v1 == v2 else f"{v1}-{v2}"
        vid = slug(book, ch, span)
        if vid in fixes:
            wrong, right = fixes[vid]
            assert wrong in text, f"FIX không còn áp dụng cho {vid}"
            text = text.replace(wrong, right)
        text = tidy_excerpt(text)
        assert vid not in seen, vid
        seen.add(vid)
        out.append({"id": vid, "ref": f"{names_vi[book]} {ch}:{span}", "topic": topic,
                    "text": text, "words": len(text.split())})

    lines = [
        "// TỰ ĐỘNG SINH bởi scripts/extract_verses.py. Không sửa tay.",
        "// Nguồn: Kinh Thánh Tiếng Việt 1934 (bản Cadman, phạm vi công cộng), scrollmapper/bible_databases.",
        "",
        "export const TOPICS = " + json.dumps([{"id": i, "name": n} for i, n in TOPICS], ensure_ascii=False) + ";",
        "",
        "export const VERSES = [",
    ]
    lines += ["  " + json.dumps(v, ensure_ascii=False) + "," for v in out]
    lines += ["];", ""]
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"Đã ghi {len(out)} câu vào {os.path.relpath(OUT)}")
    write_bible(data, fixes)


def write_bible(data, fixes):
    """Toàn bộ Kinh Thánh 1934, gọn, cho máy chủ (nhóm trưởng chọn câu gốc tuần)."""
    books = []
    for i, b in enumerate(data["books"]):
        chapters = []
        for c in b["chapters"]:
            verses = [clean(v["text"]) for v in sorted(c["verses"], key=lambda v: v["verse"])]
            chapters.append(verses)
        books.append({"n": i + 1, "slug": slug(b["name"]), "name": BOOK_NAMES_VI[i], "chapters": chapters})
    # Áp dụng các sửa lỗi nguồn cho cả bản đầy đủ (FIXES chỉ áp vào câu đơn).
    by_slug = {b["slug"]: b for b in books}
    for vid, (wrong, right) in fixes.items():
        m = re.match(r"^(.*)-(\d+)-(\d+)$", vid)
        if not m:
            continue
        b = by_slug[m.group(1)]
        ch, v = int(m.group(2)), int(m.group(3))
        b["chapters"][ch - 1][v - 1] = b["chapters"][ch - 1][v - 1].replace(wrong, right)
    os.makedirs(os.path.dirname(BIBLE_OUT), exist_ok=True)
    payload = json.dumps({"translation": "Kinh Thánh Tiếng Việt 1934 (Truyền Thống)", "books": books}, ensure_ascii=False, separators=(",", ":"))
    with gzip.open(BIBLE_OUT, "wt", encoding="utf-8", compresslevel=9) as f:
        f.write(payload)
    total = sum(len(c) for b in books for c in b["chapters"])
    print(f"Đã ghi {total} câu (66 sách) vào {os.path.relpath(BIBLE_OUT)}")


if __name__ == "__main__":
    main()
