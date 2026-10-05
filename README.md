# Manna — Học thuộc câu gốc

Trò chơi nhẹ trên web giúp giới trẻ học thuộc câu gốc Kinh Thánh, phong cách sổ tay giấy giữa làng quê Ga-li-lê.

- **Bốn chế độ:** Điền Từ · Xếp Câu · Thuộc Lòng · Góc Ôn Tập (thẻ ghi nhớ + thư viện).
- **Nội dung:** 54 câu gốc, 9 chủ đề, văn bản Kinh Thánh Tiếng Việt 1934 (bản Truyền Thống, phạm vi công cộng).
- **Tiến độ:** XP, cấp độ, chuỗi ngày, mục tiêu ngày, huy hiệu, lịch ôn tập tự động (hộp Leitner).
- **Nhóm thanh niên:**
  - Đăng nhập bằng mã nhóm + PIN, hoặc bằng Google.
  - Đồng bộ nhiều máy, chơi được khi mất mạng.
  - Bảng xếp hạng tuần, bảng vàng top 3.
  - Nhóm trưởng chọn "câu gốc tuần" từ toàn bộ Kinh Thánh.
- **Chơi không cần đăng nhập.** Khi đó tiến độ lưu trên máy, và được đưa vào tài khoản ở lần đăng nhập đầu tiên.

Tài liệu:
- [Đặc tả](docs/SPEC.md)
- [Triển khai AWS](docs/DEPLOY.md)
- [Bản thiết kế trang chủ](design/trang-chu.html)

## Chạy ở máy

```bash
npm run dev          # API + trang tĩnh ở http://localhost:8787 (cần Node ≥ 22.13; khuyên dùng 24)
```

- Không có thư viện ngoài nên không cần `npm install`.
- Cơ sở dữ liệu SQLite nằm ở `data/manna.db`.
- Muốn bật đăng nhập Google khi chạy ở máy: `GOOGLE_CLIENT_ID=... npm run dev`.

## Kiểm thử

```bash
npm test             # luật chơi, dữ liệu, API máy chủ (node --test)
npm run test:e2e     # chơi thử trong Chromium: không có máy chủ, và có máy chủ thật
                     # cần: npm i --no-save playwright && npx playwright install chromium
```

GitHub Actions chạy cả hai mỗi lần push.

## Triển khai

AWS: S3 + CloudFront cho trang, EC2 (Node + SQLite) cho `/api/*`. Xem [docs/DEPLOY.md](docs/DEPLOY.md).

```bash
./deploy/deploy-api.sh ubuntu@api-origin.example.com      # máy chủ API
./deploy/deploy-web.sh <bucket> <cloudfront-distribution-id>   # trang web
```

## Cấu hình & nội dung

- `src/config.js`:
  - `groupUrl`: link nhóm thanh niên cho nút "Tham gia nhóm".
  - Số câu mỗi lượt, điểm XP.
- **Thêm câu gốc vào bộ chung:** sửa danh sách `VERSES` trong `scripts/extract_verses.py`, rồi chạy `npm run verses`. Không sửa tay `src/data/verses.js`.
- **Câu gốc tuần của nhóm:** nhóm trưởng chọn ngay trong app (Nhóm của tôi → Câu gốc tuần).

## Cấu trúc

```
index.html            khung trang + cảnh nền
styles/               giao diện
src/main.js           khởi động + định tuyến
src/lib/              luật chơi thuần, có kiểm thử: text, progress, store, sync, random, sound
src/net/              gọi API, tài khoản, đồng bộ, Google Sign-In
src/ui/               icon, hình minh hoạ, hộp thoại, cảnh nền, dải "Hôm nay"
src/screens/          trang chủ, màn chơi, kết quả, ôn tập, hồ sơ, đăng nhập, nhóm, bảng xếp hạng
src/data/             câu gốc (sinh tự động) + danh mục câu của nhóm
server/               API Node (node:http + node:sqlite), dữ liệu Kinh Thánh 1934 đầy đủ
deploy/               CloudFormation, systemd, nginx, script cài đặt / triển khai / sao lưu
tests/  e2e/          kiểm thử đơn vị · kiểm thử trình duyệt
```
