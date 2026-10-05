# Manna — Đặc tả sản phẩm

> Game nhẹ trên web giúp giới trẻ học thuộc câu gốc Kinh Thánh.
> Phong cách giao diện: sổ tay giấy, bảng gỗ treo, làng quê Ga-li-lê buổi sáng (xem `design/trang-chu.html`).

Phiên bản tài liệu: 2.0 · Cập nhật: 10/2026

---

## 1. Mục tiêu

| | |
|---|---|
| **Vấn đề** | Học thuộc câu gốc ở nhóm thanh niên thường chỉ là đọc đi đọc lại, dễ chán, khó theo dõi ai đã thuộc. |
| **Giải pháp** | Một trò chơi ngắn (3–5 phút mỗi lượt) với nhiều cách luyện khác nhau, có điểm, cấp độ, chuỗi ngày và lịch ôn tập tự động. |
| **Người dùng** | Thanh thiếu niên 12–25 tuổi trong Hội Thánh; nhóm trưởng thanh niên (giai đoạn 2). |
| **Thiết bị** | Ưu tiên điện thoại. Chạy trên trình duyệt, không cần cài đặt, có thể "thêm vào màn hình chính". |
| **Thành công khi** | Người chơi quay lại ≥ 3 ngày/tuần; mỗi người thuộc được ≥ 1 câu mới mỗi tuần; nhóm trưởng dùng game cho câu gốc của tuần. |

**Nguyên tắc**
1. **Lời Chúa phải chính xác.** Văn bản lấy từ nguồn công khai, không gõ tay từ trí nhớ.
2. **Nhẹ và nhanh.** Không cần build, tải trang dưới 1 giây trên 4G, chơi được khi mất mạng.
3. **Vui nhưng không gây nghiện.** Không có quảng cáo, không mua bán, không bảng xếp hạng gây áp lực ở giai đoạn 1.
4. **An toàn cho trẻ vị thành niên.** Không thu thập email/số điện thoại ở giai đoạn 1; giai đoạn 3 không có chat tự do.

---

## 2. Lộ trình

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| **GĐ1 — Chơi một mình (offline)** | Trang chủ, 4 chế độ chơi, chọn chủ đề & độ khó, hồ sơ cục bộ, XP/cấp/chuỗi ngày, lịch ôn tập, thư viện câu gốc, huy hiệu, câu gốc hôm nay, cài đặt, PWA | **Xong** |
| **GĐ2 — Nhóm & bảng xếp hạng** | Đăng nhập (mã nhóm + PIN, Google), nhóm thanh niên, đồng bộ tiến độ nhiều máy, bảng xếp hạng tuần, bảng vàng top 3, nhóm trưởng đặt "câu gốc tuần" từ toàn bộ Kinh Thánh, quản lý thành viên. Chạy trên AWS (S3 + CloudFront + EC2) | **Đang làm** |
| **GĐ3 — Phòng học trực tuyến** | Phòng học (lớp học với bàn và avatar người đang online), thi đấu 1v1, cổ vũ bằng biểu tượng cảm xúc | Kế hoạch |

---

## 3. Nội dung câu gốc

### 3.1 Nguồn văn bản
- **Bản dịch:** Kinh Thánh Tiếng Việt 1934 (bản Cadman, thường gọi là "Bản Truyền Thống 1925/1926"). Bản này thuộc phạm vi công cộng.
- **Nguồn số hoá:** `scrollmapper/bible_databases` (`formats/json/Viet.json`).
- **Cách tạo dữ liệu:** `python3 scripts/extract_verses.py` tải nguồn, cắt các câu trong danh sách, chuẩn hoá và ghi ra `src/data/verses.js`. Không sửa tay file đó.
- **Chuẩn hoá tự động:**
  - Đổi ký tự `Ð` (U+00D0, lỗi số hoá) thành `Đ` (U+0110).
  - Viết hoa chữ đầu câu.
  - Đổi dấu `,` `;` `:` ở cuối đoạn trích thành dấu `.`.
- **Giữ nguyên chính tả cổ** của bản 1925: *chơn, nhơn từ, sanh, nầy, đương…*
- **Sửa lỗi nguồn** ghi rõ trong `FIXES` của script (hiện có: Thi Thiên 119:9 "Ngươi trẻ tuổi" → "Người trẻ tuổi").
- Các bản dịch có bản quyền (Truyền Thống Hiệu Đính 2010, Bản Dịch Mới…) chỉ thêm khi có giấy phép.

### 3.2 Quy trình nội dung (đã quyết định)
Nguyên tắc: **không ai gõ tay văn bản Kinh Thánh**, kể cả nhóm trưởng. Mọi câu đều được trích tự động từ cùng một nguồn công cộng.

| Việc | Ai làm | Cách làm |
|---|---|---|
| Bộ câu chung của app | Chủ dự án duyệt | Thêm địa chỉ câu vào danh sách trong `scripts/extract_verses.py` → chạy script → kiểm thử dữ liệu tự động → commit. |
| Câu gốc tuần của nhóm | Nhóm trưởng | Chọn sách, chương, câu trong **toàn bộ Kinh Thánh 1934** ngay trong app. Máy chủ tự trích văn bản, nên khớp được với câu gốc bài giảng Chúa Nhật mà không có lỗi gõ. |
| Sửa lỗi bản số hoá | Chủ dự án | Chỉ qua danh sách `FIXES` của script, mỗi mục ghi lý do. Script báo lỗi nếu chỗ sửa không còn khớp nguồn. |
| Thêm bản dịch khác | Chưa làm | Truyền Thống Hiệu Đính 2010 và Bản Dịch Mới có bản quyền, cần giấy phép. Dữ liệu đã có chỗ ghi tên bản dịch để thêm sau. |

Lý do chọn cách này:
- Độ chính xác của Lời Chúa là nguyên tắc số 1.
- Nhóm trưởng vẫn linh hoạt theo bài giảng hằng tuần.
- Không cần người kiểm duyệt văn bản, vì không có chỗ nào nhập văn bản tự do.

### 3.3 Bộ câu khởi đầu
54 câu, 9 chủ đề:

| Mã | Chủ đề | Ví dụ |
|---|---|---|
| `love` | Tình yêu | Giăng 3:16, 1 Giăng 4:19 |
| `faith` | Đức tin | Hê-bơ-rơ 11:1, Châm Ngôn 3:5-6 |
| `peace` | Bình an | Thi Thiên 23:1, Phi-líp 4:6 |
| `courage` | Can đảm | Giô-suê 1:9, Phi-líp 4:13 |
| `hope` | Hy vọng | Giê-rê-mi 29:11, Ê-sai 40:31 |
| `word` | Lời Chúa | Thi Thiên 119:105, 119:11 |
| `youth` | Tuổi trẻ | 1 Ti-mô-thê 4:12, Thi Thiên 119:9 |
| `salvation` | Ơn cứu rỗi | Rô-ma 6:23, 2 Cô-rinh-tô 5:17 |
| `life` | Sống đẹp | Ga-la-ti 5:22-23, Mi-chê 6:8 |

### 3.4 Cấu trúc một câu gốc
```js
{
  id: "john-3-16",          // duy nhất, không đổi
  ref: "Giăng 3:16",        // hiển thị
  topic: "love",            // mã chủ đề
  text: "Vì Đức Chúa Trời yêu thương thế gian, …",
  words: 33                 // số từ, dùng để tính độ khó
}
```
Độ dài: **ngắn** ≤ 20 từ, **vừa** 21–32 từ, **dài** > 32 từ.

---

## 4. Vòng lặp chơi

```
Trang chủ → chọn chế độ → chọn chủ đề + độ khó → lượt chơi (3–6 câu) → kết quả (XP, sao, huy hiệu) → chơi tiếp / về trang chủ
                                                            ↘ cập nhật lịch ôn tập của từng câu
```

### 4.1 Chọn câu cho một lượt
Mỗi lượt lấy câu trong chủ đề đã chọn theo thứ tự ưu tiên:
1. Câu **đến hạn ôn** (hạn ≤ hôm nay), hộp thấp trước.
2. Câu **mới** (chưa học).
3. Câu đang học chưa đến hạn, ngẫu nhiên.

Ở độ khó **Dễ**, ưu tiên câu ngắn và vừa. Nếu chủ đề có ít câu hơn số câu một lượt thì lấy hết.

### 4.2 Độ khó

| | Dễ | Vừa | Khó |
|---|---|---|---|
| Điền Từ: ô trống mỗi câu | 1 (+1 nếu câu dài) | 2 (+1 nếu câu dài) | 3 (+1 nếu câu dài) |
| Xếp Câu: số mảnh | 3–4 cụm lớn | cụm theo dấu câu (3–7) | nhóm 2–3 từ (tối đa 10) |
| Thuộc Lòng: gợi ý | chữ cái đầu + dấu câu | chữ cái đầu | chỉ số từ (gạch trống) |

---

## 5. Bốn chế độ chơi

### 5.1 Điền Từ (thẻ xanh lá)
- Một lượt: **6 câu**.
- Câu gốc hiện ra với các ô trống. Ô đang hỏi được tô vàng. Bên dưới có **4 lựa chọn**.
- **Chọn ô trống:**
  - Ưu tiên từ có nghĩa: bỏ qua hư từ như *và, là, của, thì, mà, các, những…*.
  - Hai ô trống không nằm sát nhau.
- **Chọn từ gây nhiễu:**
  - Lấy từ các câu gốc khác, độ dài gần bằng đáp án, không trùng đáp án và không trùng từ đang có trong câu.
  - Nếu đáp án viết hoa thì viết hoa cả từ nhiễu, để không lộ đáp án.
- **Đúng:** ô chuyển xanh, có âm thanh, **+5 XP**. Đúng liên tiếp từ lần thứ 3 trở đi (combo) được **+2 XP** thưởng thêm mỗi lần.
- **Sai:** ô chuyển đỏ và rung, hiện đáp án đúng, combo về 0.
- Trả lời hết ô trống của một câu thì hiện thanh phản hồi ở đáy màn hình ("Chính xác!" hoặc "Cố lên!"), kèm nút **Tiếp tục**.
- Câu được tính **thành công** khi đúng tất cả ô trống.

### 5.2 Xếp Câu (thẻ đỏ)
- Một lượt: **4 câu**.
- Câu gốc được cắt thành các mảnh rồi xáo trộn. Không bao giờ giữ nguyên thứ tự đúng ban đầu.
- Chạm mảnh ở "kho" để đưa lên khung trả lời; chạm mảnh trong khung để trả về kho.
- Khi đặt hết các mảnh, game tự kiểm tra:
  - **Đúng:** **+20 XP** nếu không sai và không dùng gợi ý; ngược lại **+8 XP**.
  - **Sai:** các mảnh sai vị trí chuyển đỏ. Sau 0,8 giây, phần đúng từ đầu được giữ lại, các mảnh còn lại quay về kho.
- Nút **Gợi ý**: đặt mảnh đúng tiếp theo vào khung.
- Câu được tính **thành công** khi đúng ngay lần đầu và không dùng gợi ý.

### 5.3 Thuộc Lòng (thẻ xanh ngọc)
- Một lượt: **3 câu**.
- Hiện địa chỉ câu và gợi ý theo độ khó. Người chơi gõ lại cả câu vào ô nhập.
- **Chấm điểm:**
  - Tách từ, bỏ dấu câu, không phân biệt hoa thường.
  - Điểm giống nhau = `2 × số từ khớp theo thứ tự (LCS) / (số từ đúng + số từ đã gõ)`.
  - Gõ thừa từ cũng bị trừ điểm.
- **Đạt** khi điểm ≥ 90%. XP = `làm tròn(điểm × 25)`.
- Nút **Xem câu** hiện toàn bộ câu trong 5 giây. Dùng nút này thì **−5 XP** và câu không được tính thành công.
- Cài đặt **"Không bắt buộc gõ dấu"**: khi so sánh, bỏ dấu thanh và đổi *đ* thành *d*.
- Sau khi chấm, hiện lại câu gốc: từ đúng màu xanh, từ thiếu gạch chân đỏ.

### 5.4 Góc Ôn Tập (thẻ tím)
Màn hình có 2 tab:
1. **Thẻ ôn hôm nay** — thẻ ghi nhớ:
   - Mỗi phiên có tối đa 10 thẻ đến hạn. Nếu không có thẻ nào đến hạn thì lấy 5 câu mới.
   - Mặt trước là địa chỉ câu, chủ đề và nút "Gợi ý chữ đầu". Chạm để lật xem cả câu.
   - Nút **Đã thuộc** (+5 XP, lên hộp) / **Chưa thuộc** (xuống hộp).
   - Nút **Nghe** đọc to câu gốc nếu thiết bị có giọng tiếng Việt.
2. **Thư viện:**
   - Tất cả câu gốc, lọc theo chủ đề và tìm theo chữ.
   - Mỗi câu có số sao (0–5) và trạng thái *Mới / Đang học / Đã thuộc*.
   - Chạm vào câu để xem chi tiết, kèm 3 nút luyện riêng câu đó bằng từng chế độ.

---

## 6. Tiến độ & phần thưởng

### 6.1 Lịch ôn tập (hộp Leitner)
Mỗi câu có trạng thái `{ box, due, seen, correct, lastUp }`.

| Hộp | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| Ý nghĩa | Mới | Đang học | | | **Đã thuộc** | Thuộc lâu |
| Ôn lại sau | — | 1 ngày | 2 ngày | 4 ngày | 7 ngày | 14 ngày |

- **Thành công** ở bất kỳ chế độ nào: lên 1 hộp, tối đa hộp 5. **Mỗi câu chỉ được lên hộp 1 lần mỗi ngày**, để chơi đi chơi lại trong một ngày không thay cho việc ôn cách ngày.
- **Không thành công:** xuống 1 hộp (thấp nhất là hộp 1), hạn ôn = hôm nay.
- Số sao của câu = số hộp. "Đã thuộc" = hộp ≥ 4.

### 6.2 XP, cấp độ, chuỗi ngày
- **Cân bằng XP:** mỗi lượt của Điền Từ, Xếp Câu, Thuộc Lòng cho khoảng 60–90 XP, nên một lượt ≈ mục tiêu ngày mặc định. Các con số nằm trong `src/config.js`.
- **Cấp độ:** lên cấp tiếp theo cần `100 + 50 × (cấp − 1)` XP (cấp 1→2 cần 100, cấp 2→3 cần 150…).
- **Mục tiêu ngày** chọn trong cài đặt: 30 / 50 / 100 XP (mặc định 50). Đạt mục tiêu thì có thông báo.
- **Chuỗi ngày:**
  - Một ngày được tính khi có ít nhất 1 XP, theo giờ địa phương.
  - Ngày hôm qua có chơi thì chuỗi +1. Bỏ quá 1 ngày thì chuỗi về 1.
  - Lưu kỷ lục chuỗi dài nhất.
- **Câu gốc hôm nay:** chọn cố định theo ngày. Hoàn thành một lượt có câu đó lần đầu trong ngày được thưởng **+20 XP**.

### 6.3 Huy hiệu

| Mã | Tên | Điều kiện |
|---|---|---|
| `first-round` | Bước đầu tiên | Hoàn thành lượt chơi đầu tiên |
| `perfect` | Hoàn hảo | Một lượt không sai câu nào |
| `streak-3` / `streak-7` / `streak-30` | Chuỗi 3 / 7 / 30 ngày | Chuỗi ngày đạt mốc |
| `learned-5` / `learned-20` / `learned-50` | Thuộc 5 / 20 / 50 câu | Số câu ở hộp ≥ 4 |
| `topic-master` | Trọn chủ đề | Thuộc hết một chủ đề |
| `level-5` / `level-10` | Cấp 5 / Cấp 10 | Đạt cấp |
| `votd-7` | Bạn của Lời | Hoàn thành câu gốc hôm nay 7 lần |

### 6.4 Màn hình kết quả
Hiển thị:
- Chiên con ăn mừng và 1–3 sao: ≥ 50% câu thành công được 1 sao, ≥ 80% được 2 sao, 100% được 3 sao.
- XP nhận được (số chạy lên), combo cao nhất, thanh tiến độ cấp.
- Huy hiệu mới và danh sách câu trong lượt kèm kết quả từng câu.

Có 3 nút: **Chơi tiếp** · **Đổi chủ đề** · **Trang chủ**.

---

## 7. Giao diện

### 7.1 Ngôn ngữ thiết kế (đã duyệt)
- **Nền:** làng Ga-li-lê buổi sáng gồm biển hồ, đồi, đàn chiên, nhà đá, cây chà là, cây ô-liu và dây cờ. Hạt ma-na rơi nhẹ. Nền đứng yên khi cuộn trang.
- **Thẻ:** trang sổ tay có lò xo, giấy hơi nghiêng, nhấc lên khi rê chuột.
- **Nút:** nổi 3D, có bóng ở đáy, lún xuống khi nhấn.
- **Bảng tên:** gỗ treo bằng dây, đung đưa khi mở trang.
- **Linh vật:** chiên con (dưới trái), bồ câu ngậm cành ô-liu (dưới phải).
- **Phông chữ:** Paytone One (logo), Baloo 2 (tiêu đề, nút), Nunito (nội dung), Pangolin (câu gốc dạng viết tay).
- **Màu theo chế độ:** Điền Từ xanh lá · Xếp Câu đỏ · Thuộc Lòng xanh ngọc · Ôn Tập tím. Màu nhấn phụ là vàng lúa mì.

### 7.2 Danh sách màn hình

| Màn hình | Đường dẫn | Ghi chú |
|---|---|---|
| Trang chủ | `#/` | Dải "Hôm nay", hồ sơ, bảng tên, 4 thẻ, câu gốc hôm nay, phòng học |
| Chọn chủ đề | hộp thoại | Chủ đề (kèm số câu đã thuộc), độ khó, nút Bắt đầu |
| Điền Từ | `#/play/fill` | tham số `topic`, `level`, `verse` |
| Xếp Câu | `#/play/order` | như trên |
| Thuộc Lòng | `#/play/recall` | như trên |
| Kết quả | trong màn chơi | |
| Góc Ôn Tập | `#/review` | tab Thẻ ôn / Thư viện |
| Hồ sơ & Cài đặt | hộp thoại | tên, avatar, thống kê, huy hiệu, cài đặt, xoá tiến độ |
| Bạn bè / Bảng xếp hạng / Phòng học | hộp thoại | GĐ1 hiện "Sắp ra mắt" kèm thành tích cá nhân |

### 7.3 Yêu cầu chung
- **Bố cục:**
  - Từ 360px trở lên.
  - ≤ 620px: thẻ chế độ xếp ngang, ẩn linh vật.
  - Màn chơi có thanh phản hồi dính ở đáy.
- **Hỗ trợ tiếp cận:**
  - Điều khiển được bằng bàn phím: phím 1–4 để chọn đáp án, Enter để tiếp tục.
  - Có viền khi focus.
  - `prefers-reduced-motion` tắt mọi chuyển động.
  - Độ tương phản chữ ≥ 4.5:1.
- **Cỡ chữ câu gốc** có 2 mức: thường / lớn.
- **Âm thanh** tạo bằng WebAudio (không có file âm thanh), bật/tắt được.
- **Thoát giữa lượt** phải xác nhận ngay trên trang (không dùng `confirm()`).

---

## 8. Kỹ thuật

### 8.1 Kiến trúc GĐ1
- **Công nghệ:** trang tĩnh, JavaScript ES modules thuần, **không cần build**. Định tuyến bằng hash.
- **Lưu trữ:** `localStorage`, khoá `manna.v2`, có số phiên bản schema và hàm chuyển đổi dữ liệu từ bản cũ.
- **PWA:** `manifest.webmanifest` và `sw.js`. Phần khung app ưu tiên tải mới qua mạng, mất mạng thì dùng bản đã lưu; phông chữ dùng bản đã lưu và cập nhật ngầm.

```
index.html               khung trang + cảnh nền SVG
styles/base.css          token, cảnh nền, nút, thẻ, trang chủ
styles/game.css          màn chơi, hộp thoại, ôn tập
src/main.js              khởi động, định tuyến
src/config.js            tên app, link nhóm, tham số chơi
src/data/verses.js       dữ liệu câu gốc (sinh tự động)
src/lib/text.js          tách từ, chuẩn hoá, cắt mảnh, chấm điểm (thuần)
src/lib/progress.js      XP, cấp, chuỗi, Leitner, huy hiệu (thuần)
src/lib/random.js        RNG có seed, xáo trộn (thuần)
src/lib/store.js         đọc/ghi/chuyển đổi trạng thái
src/lib/sound.js         âm thanh WebAudio
src/ui/*.js              DOM helper, icon, toast/hộp thoại, cảnh nền
src/screens/*.js         từng màn hình
tests/*.test.js          kiểm thử (node --test)
scripts/extract_verses.py  sinh dữ liệu câu gốc
```

### 8.2 Trạng thái lưu cục bộ (schema v3)
```js
{
  v: 3,
  profile: { name, avatar },
  settings: { sound, dailyGoal, lenient, bigText },
  xp, bestStreak, today: { date, xp },
  days: ["2026-10-04", "2026-10-05"],          // các ngày có học (tối đa 400), dùng tính chuỗi
  verses: { [id]: { box, due, seen, correct, lastUp, at } },   // at = thời điểm cập nhật, dùng khi gộp
  badges: { [id]: "2026-10-05" },
  stats: { rounds, perfectRounds, votdDone, votdCount },
  extraVerses: { [id]: { id, ref, topic: "group", text, words } },  // câu gốc tuần của nhóm
  last: { topic, level },
  sync: { deviceId, pending: [/* sự kiện XP chưa gửi */], lastSync }
}
```
Bản v2 được chuyển tự động: dựng lại `days` từ chuỗi ngày, và tạo một sự kiện "nhập" chứa số XP cũ để đưa lên máy chủ khi đăng nhập lần đầu.

### 8.3 Kiểm thử
- `npm test`: chạy `node --test`, kiểm tra các module thuần và dữ liệu (id duy nhất, chủ đề hợp lệ, không còn ký tự `Ð`).
- `npm run test:e2e` (tuỳ chọn, cần Playwright): mở trang, chơi thử mỗi chế độ, kiểm tra không có lỗi JS.
- GitHub Actions chạy `npm test` mỗi lần push.

### 8.4 Triển khai (AWS)
```
Người chơi ──HTTPS──▶ CloudFront  (manna.<tên-miền>)
                        ├── /*       → S3 (trang tĩnh, truy cập qua OAC)
                        └── /api/*   → EC2 (Node.js 24 + SQLite) qua HTTPS (nginx + Let's Encrypt)
```
- **Một tên miền duy nhất.** Trang và API cùng nguồn gốc, nên dùng được cookie HttpOnly mà không cần CORS.
- **CloudFront, nhánh `/api/*`:**
  - Cache policy `CachingDisabled`.
  - Origin request policy `AllViewerExceptHostHeader`.
  - Gửi kèm header bí mật `X-Origin-Verify` để EC2 chỉ nhận yêu cầu đi qua CloudFront.
- **S3:** chặn truy cập công khai. Dùng `index.html` làm default root object.
- **EC2:**
  - Máy t4g.small (hoặc t3.small) là đủ.
  - Node 24 LTS chạy bằng systemd; nginx làm TLS.
  - Dữ liệu ở `/var/lib/manna/manna.db`, sao lưu hằng ngày lên S3.
- Hướng dẫn từng bước và script: `docs/DEPLOY.md`, thư mục `deploy/`.
- **Chạy thử ở máy:** `npm start` chạy cả API lẫn trang tĩnh ở `http://localhost:8787`.

### 8.5 GĐ2 — Backend
**Công nghệ**
- Node.js ≥ 22.13 (khuyên dùng 24 LTS).
- **Không có thư viện ngoài**: HTTP bằng `node:http`, cơ sở dữ liệu bằng `node:sqlite`, mật mã bằng `node:crypto`.
- Code nằm trong thư mục `server/`.
- Luật gộp dữ liệu dùng chung một module với trình duyệt (`src/lib/sync.js`).

**Đăng nhập (dùng được cả hai cách)**

| Cách | Dành cho | Chi tiết |
|---|---|---|
| Mã nhóm + tên + PIN 4–6 số | Bạn trẻ không có, hoặc không muốn dùng email | Tên là duy nhất trong nhóm. Sai PIN 5 lần thì khoá 15 phút. Nhóm trưởng đặt lại PIN khi bạn quên. |
| Google | Nhóm trưởng, bạn lớn tuổi | Chỉ tài khoản Google mới **tạo được nhóm**. Người dùng PIN có thể liên kết thêm Google để đăng nhập trên máy khác. |

- **Phiên đăng nhập:** cookie `manna_sid` (HttpOnly, Secure, SameSite=Lax, 90 ngày). Máy chủ chỉ lưu bản băm SHA-256 của token.
- **Chống CSRF:** các yêu cầu ghi bắt buộc gửi JSON và phải có `Origin` hợp lệ.
- **PIN:** băm bằng scrypt, mỗi người một salt riêng.
- **Giới hạn tần suất:** 20 yêu cầu đăng nhập mỗi phút cho mỗi IP.

**Vai trò**
- `member`: thành viên.
- `leader`: nhóm trưởng, được:
  - đổi tên nhóm và đổi mã mời;
  - đặt câu gốc tuần;
  - đặt lại PIN cho thành viên;
  - mời thành viên ra khỏi nhóm;
  - cử thêm nhóm trưởng.

Nhóm phải luôn còn ít nhất một nhóm trưởng.

**Đồng bộ nhiều máy, chơi được khi mất mạng**
1. Mỗi lượt chơi hoặc thẻ ôn tạo một *sự kiện* `{ id, day, at, xp, kind, mode, perfect, votd }` trong hàng đợi trên máy.
2. Khi có mạng (sau mỗi lượt, khi mở app, khi có mạng lại), máy gửi `POST /api/sync` kèm:
   - các sự kiện đang chờ;
   - trạng thái từng câu;
   - huy hiệu;
   - các ngày đã học.
3. Máy chủ gộp dữ liệu:
   - **Sự kiện:** bỏ qua id đã nhận, nên gửi lại bao nhiêu lần cũng không cộng trùng.
   - **Trạng thái câu:** giữ bản có `at` mới nhất.
   - **Huy hiệu và ngày học:** lấy hợp của hai bên.
   - **XP và thống kê:** tính bằng tổng các sự kiện.
4. Máy nhận lại trạng thái đã gộp, xoá các sự kiện đã được xác nhận khỏi hàng đợi.

Kết quả: chơi trên điện thoại và máy tính, kể cả lúc mất mạng, XP vẫn cộng đúng và không mất tiến độ.

**Chống gian lận nhẹ.** Máy chủ từ chối sự kiện nếu:
- XP > 250 trong một sự kiện;
- tổng XP > 3.000 trong một ngày;
- ngày của sự kiện cũ hơn 60 ngày hoặc nằm ở tương lai.

**Bảng xếp hạng**
- Tính theo tuần ISO (thứ Hai đến Chủ Nhật), chỉ trong nhóm.
- Hiển thị top 20 và vị trí của mình. Có tab "Mọi lúc".
- Dải đầu trang chủ hiện "Bảng vàng tuần" với top 3 (giống Bufopia).

**Câu gốc tuần**
- Khi nhóm trưởng đặt câu gốc tuần, câu đó thay "câu gốc hôm nay" cho cả nhóm trong tuần.
- Thưởng +20 XP mỗi ngày như thường.
- Câu được lưu xuống máy để học khi mất mạng.

**Bảng dữ liệu (SQLite)**
- `groups(id, code, name, created_at)`
- `users(id, group_id, name, name_key, avatar, role, pin_hash, google_sub, email, failed_pins, locked_until, created_at, last_seen)`
- `sessions(token_hash, user_id, expires_at)`
- `events(user_id, id, day, week, at, xp, kind, mode, perfect, votd)`
- `user_verses(user_id, verse_id, box, due, seen, correct, last_up, at)`
- `user_badges(user_id, badge_id, day)`
- `user_days(user_id, day)`
- `weekly_verses(group_id, week, verse_id, ref, text, set_by)`

**API**

| Phương thức | Đường dẫn | Việc |
|---|---|---|
| GET | `/api/health`, `/api/config` | Kiểm tra sống; Google client ID |
| POST | `/api/auth/pin/join`, `/api/auth/pin/login` | Tạo tài khoản / đăng nhập bằng mã nhóm + tên + PIN |
| POST | `/api/auth/google`, `/api/auth/logout` | Đăng nhập Google; đăng xuất |
| GET, PATCH, DELETE | `/api/me` | Xem, sửa tên/avatar, xoá tài khoản |
| POST | `/api/me/google` | Liên kết Google cho tài khoản PIN |
| POST | `/api/groups`, `/api/groups/join` | Tạo nhóm (Google) / vào nhóm bằng mã |
| GET, PATCH | `/api/group` | Thông tin nhóm + thành viên; đổi tên nhóm |
| POST | `/api/group/code` | Đổi mã mời |
| PUT, DELETE | `/api/group/weekly-verse` | Đặt / bỏ câu gốc tuần |
| POST, DELETE | `/api/group/members/:id/pin`, `/api/group/members/:id` | Đặt lại PIN / mời ra khỏi nhóm |
| POST | `/api/group/members/:id/role` | Cử hoặc bỏ nhóm trưởng |
| GET | `/api/bible/books`, `/api/bible/passage` | Danh sách sách; trích văn bản một đoạn |
| POST | `/api/sync` | Đồng bộ tiến độ |
| GET | `/api/leaderboard?period=week\|all` | Bảng xếp hạng nhóm |

**Quyền riêng tư (người dùng phần lớn là trẻ vị thành niên)**
- Chỉ lưu tên hiển thị và avatar; với người dùng Google thì lưu thêm email.
- Dữ liệu nhóm chỉ thành viên trong nhóm thấy.
- Người dùng tự xoá được tài khoản cùng toàn bộ dữ liệu.
- Không có quảng cáo, không có theo dõi bên thứ ba.

### 8.6 GĐ3 — Phòng học & thi đấu
- **Phòng học:** WebSocket ngay trên máy chủ EC2. Một tiến trình Node giữ trạng thái các phòng; CloudFront chuyển tiếp WebSocket ở nhánh `/api/*`. Phòng giữ danh sách người online (bàn học + avatar như sảnh của Bufopia) và trạng thái *đang học / đang chờ bạn*.
- **Thi đấu 1v1:**
  - Hai người nhận cùng 5 câu (cùng seed) ở chế độ Điền Từ.
  - Điểm = số câu đúng × 100 + thưởng tốc độ.
  - Kết thúc có màn hình so điểm.
- **Giao tiếp:** chỉ dùng câu soạn sẵn và biểu tượng cảm xúc. Có nút báo cáo; nhóm trưởng mời được người khác ra khỏi phòng.

---

## 9. Ngoài phạm vi GĐ2
- Phòng học trực tuyến và thi đấu 1v1 (GĐ3). Nút "Phòng học" vẫn hiện "Sắp ra mắt".
- Nhiều bản dịch, tiếng Anh.
- Chơi không đăng nhập vẫn được như GĐ1. Tiến độ khi đó chỉ nằm trên máy, và được đưa lên tài khoản ở lần đăng nhập đầu tiên.

## 10. Quyết định của chủ dự án
| # | Câu hỏi | Quyết định |
|---|---|---|
| 1 | Tên chính thức | **Manna** |
| 2 | Link nhóm thanh niên | Bổ sung sau, điền vào `src/config.js` (`groupUrl`) |
| 3 | Cách đăng nhập | **Cả hai**: mã nhóm + PIN, và Google |
| 4 | Rà soát nội dung | Theo quy trình mục 3.2: chỉ trích tự động từ bản 1934, nhóm trưởng chọn câu tuần theo địa chỉ |
| 5 | Hạ tầng | **AWS**: S3 + CloudFront cho trang, EC2 cho API (mục 8.4) |

## 11. Danh sách việc GĐ1
- [x] Thiết kế trang chủ
- [x] Đặc tả
- [x] Dữ liệu câu gốc từ nguồn công khai + script sinh dữ liệu
- [x] Module thuần: text, progress, random, store + kiểm thử
- [x] Trang chủ, chọn chủ đề, hồ sơ & cài đặt
- [x] Điền Từ, Xếp Câu, Thuộc Lòng, kết quả
- [x] Góc Ôn Tập (thẻ ghi nhớ + thư viện)
- [x] Huy hiệu, câu gốc hôm nay, mục tiêu ngày
- [x] PWA (chơi offline)
- [x] CI chạy kiểm thử

## 12. Danh sách việc GĐ2
- [x] Cập nhật đặc tả (quyết định, AWS, backend)
- [ ] Dữ liệu toàn bộ Kinh Thánh 1934 cho máy chủ
- [ ] Máy chủ: cơ sở dữ liệu, đăng nhập PIN + Google, nhóm, đồng bộ, bảng xếp hạng, câu gốc tuần + kiểm thử
- [ ] Trình duyệt: schema v3, hàng đợi sự kiện, đồng bộ
- [ ] Giao diện: đăng nhập, nhóm, bảng xếp hạng, bảng vàng, công cụ nhóm trưởng
- [ ] Triển khai AWS: tài liệu, script, systemd, nginx, sao lưu
