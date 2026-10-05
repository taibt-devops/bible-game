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

## Chạy bằng Docker (web + api + cơ sở dữ liệu)

```bash
docker compose up -d --build        # mở http://localhost:8080
```

| Thành phần | Vai trò |
|---|---|
| `web` | nginx phục vụ giao diện, chuyển `/api/*` về `api` |
| `api` | Node 24, chạy luật chơi và tài khoản |
| volume `manna-data` | Cơ sở dữ liệu SQLite (`/data/manna.db`), còn nguyên khi khởi động lại hoặc build lại |

- **Không có container cơ sở dữ liệu riêng.** SQLite là một file nằm trong backend, nên không cần thêm Postgres hay MySQL. Đủ cho hàng nghìn người chơi.
- **Nhóm thử có sẵn** để chơi ngay: bấm *Nhóm của tôi* → *Lần đầu vào nhóm* → mã `MANNA7`, chọn tên và PIN.
  - Nhóm trưởng thử: tên `Nhóm trưởng`, PIN `1234`.
  - Tắt nhóm thử bằng `SEED_DEMO=0`.
- **Đăng nhập Google:** `GOOGLE_CLIENT_ID=... docker compose up -d`. Trong Google Cloud, thêm `http://localhost:8080` vào *Authorized JavaScript origins*.
- **Đổi cổng:** `WEB_PORT=3000 docker compose up -d`.
- **Docker Hub báo lỗi 429 (giới hạn tải):** thêm `NODE_IMAGE=mirror.gcr.io/library/node:24-alpine NGINX_IMAGE=mirror.gcr.io/library/nginx:1.27-alpine` trước lệnh build.

Quản trị bằng dòng lệnh:

```bash
docker compose exec api node server/cli.js groups                                  # các nhóm + mã mời
docker compose exec api node server/cli.js create-group "Thanh niên Ân Điển" "Anh Tú" 2468
docker compose exec api node server/cli.js members MANNA7
docker compose exec api node server/cli.js reset-pin MANNA7 "Bé Na" 1357
docker compose exec api node server/cli.js backup /data/backup.db
docker compose cp api:/data/backup.db ./backup.db                                  # chép bản sao lưu ra máy
docker compose down          # dừng (giữ dữ liệu);  docker compose down -v  để xoá luôn dữ liệu
```

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
server/               API Node (node:http + node:sqlite), dữ liệu Kinh Thánh 1934 đầy đủ, cli.js quản trị
docker/  compose.yaml Docker: api, web (nginx), volume dữ liệu
deploy/               CloudFormation, systemd, nginx, script cài đặt / triển khai / sao lưu
tests/  e2e/          kiểm thử đơn vị · kiểm thử trình duyệt
```
