# Manna — Học thuộc câu gốc

Trò chơi nhẹ trên web giúp giới trẻ học thuộc câu gốc Kinh Thánh, phong cách sổ tay giấy giữa làng quê Ga-li-lê.

- **4 chế độ:** Điền Từ · Xếp Câu · Thuộc Lòng · Góc Ôn Tập (thẻ ghi nhớ + thư viện)
- **54 câu gốc, 9 chủ đề**, văn bản Kinh Thánh Tiếng Việt 1934 (bản Truyền Thống, phạm vi công cộng)
- XP, cấp độ, chuỗi ngày, mục tiêu ngày, huy hiệu, lịch ôn tập tự động (hộp Leitner), câu gốc hôm nay
- Chạy trên điện thoại, không cần cài, chơi được khi mất mạng (PWA). Tiến độ lưu trên trình duyệt.

Đặc tả đầy đủ: [`docs/SPEC.md`](docs/SPEC.md) · Bản thiết kế trang chủ: [`design/trang-chu.html`](design/trang-chu.html)

## Chạy thử

```bash
npm run dev          # mở http://localhost:5173
```

Cần một web server (ES modules không chạy khi mở file trực tiếp). Lệnh trên dùng `python3 -m http.server`; dùng `npx serve` cũng được.

## Kiểm thử

```bash
npm test             # kiểm thử luật chơi và dữ liệu (node --test, không cần cài gì)
npm run test:e2e     # chơi thử mọi chế độ trong Chromium; cần: npm i -D playwright && npx playwright install chromium
```

## Triển khai

Trang tĩnh, không cần build. Trên **Cloudflare Pages** hoặc **GitHub Pages**: không có lệnh build, thư mục xuất là thư mục gốc repo.
Khi phát hành bản mới, tăng `VERSION` trong `sw.js` để người chơi nhận code mới.

## Cấu hình & nội dung

- `src/config.js`: link nhóm thanh niên (nút "Tham gia nhóm"), số câu mỗi lượt, điểm XP.
- Thêm câu gốc: sửa danh sách `VERSES` trong `scripts/extract_verses.py` rồi chạy `npm run verses`. Không sửa tay `src/data/verses.js`.

## Cấu trúc

```
index.html          khung trang + cảnh nền
styles/             giao diện (base.css, game.css)
src/main.js         khởi động + định tuyến
src/lib/            luật chơi thuần, có kiểm thử: text, progress, store, random, sound
src/ui/             icon, hình minh hoạ, hộp thoại, cảnh nền, dải "Hôm nay"
src/screens/        trang chủ, chọn chủ đề, 3 màn chơi, kết quả, ôn tập, hồ sơ
src/data/verses.js  dữ liệu câu gốc (sinh tự động)
tests/              kiểm thử đơn vị · e2e/ kiểm thử trình duyệt
```
