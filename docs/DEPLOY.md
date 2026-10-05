# Triển khai Manna trên AWS

```
Người chơi ──HTTPS──▶ CloudFront (manna.<tên-miền>)
                        ├── /*       → S3 (trang tĩnh, riêng tư, đọc qua OAC)
                        └── /api/*   → EC2: nginx (HTTPS, Let's Encrypt) → Node 24 + SQLite
                                        kèm header bí mật X-Origin-Verify
```

- **Một tên miền** cho cả trang và API, nên cookie đăng nhập hoạt động mà không cần CORS.
- **EC2 chỉ nhận yêu cầu từ CloudFront:**
  - Security Group chỉ mở cổng 443 cho dải IP của CloudFront.
  - Máy chủ kiểm tra header `X-Origin-Verify`.
- **Không cần `npm install` trên máy chủ.** Code chỉ dùng thư viện có sẵn của Node.
- **Vùng nên chọn:** `ap-southeast-1` (Singapore), gần Việt Nam nhất.
- **Chi phí tham khảo:**
  - EC2 t4g.small: khoảng 12–16 USD/tháng tuỳ vùng.
  - EBS 16 GB: khoảng 1–2 USD/tháng.
  - S3 + CloudFront: gần như miễn phí ở quy mô nhóm thanh niên (CloudFront có 1 TB/tháng miễn phí).

Trong tài liệu này, `manna.example.com` là tên miền của game, `api-origin.example.com` là tên miền riêng của EC2. Hãy thay bằng tên miền thật.

---

## 1. Google OAuth (đăng nhập Google)

1. Vào Google Cloud Console → **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized JavaScript origins:**
   - `https://manna.example.com`
   - `http://localhost:8787` (để chạy thử ở máy)
4. Không cần Redirect URI.
5. Màn hình xin quyền (OAuth consent screen): chỉ cần các quyền `openid`, `email`, `profile`.
6. Ghi lại **Client ID**, dùng cho `GOOGLE_CLIENT_ID` ở bước 2.

## 2. Máy chủ EC2

### 2.1 Tạo máy
| Mục | Giá trị |
|---|---|
| AMI | Ubuntu Server 24.04 LTS (arm64) |
| Loại | t4g.small (2 GB RAM) |
| Ổ đĩa | gp3 16 GB |
| Elastic IP | Gắn một Elastic IP; tạo bản ghi DNS **A** `api-origin.example.com` → IP này |
| IAM role | `AmazonSSMManagedInstanceCore`, cộng quyền `s3:PutObject` vào bucket sao lưu (mục 6) |

**Security Group (chiều vào):**

| Cổng | Nguồn | Lý do |
|---|---|---|
| 443 | Managed prefix list `com.amazonaws.global.cloudfront.origin-facing` | Chỉ CloudFront gọi được API |
| 80 | `0.0.0.0/0` | Chỉ để Let's Encrypt cấp và gia hạn chứng chỉ; mọi thứ khác bị chuyển sang HTTPS |
| 22 | IP của bạn | Hoặc bỏ hẳn và dùng SSM Session Manager |

> Prefix list của CloudFront được tính là 55 quy tắc trong giới hạn 60 quy tắc của một Security Group. Nên đặt quy tắc 443 này vào một Security Group riêng.

### 2.2 Cài đặt (một lần)
```bash
scp -r deploy ubuntu@api-origin.example.com:
ssh ubuntu@api-origin.example.com
sudo bash deploy/setup-ec2.sh api-origin.example.com ban@example.com
```
Script này làm các việc sau:
- Cài Node 24, nginx, certbot, AWS CLI.
- Tạo người dùng hệ thống `manna`, thư mục `/opt/manna` và `/var/lib/manna`.
- Cài dịch vụ systemd `manna` và lịch sao lưu hằng ngày.
- Lấy chứng chỉ Let's Encrypt và cấu hình nginx (xem `deploy/nginx-manna.conf`).

### 2.3 Cấu hình
```bash
sudo nano /etc/manna/manna.env      # mẫu: deploy/manna.env.example
```
Cần điền:
- `PUBLIC_ORIGIN=https://manna.example.com`
- `ORIGIN_SECRET`: tạo bằng `openssl rand -base64 36`. Ghi lại vì cần dùng ở bước 4.
- `GOOGLE_CLIENT_ID` (lấy ở bước 1).
- `BACKUP_S3_URI`, ví dụ `s3://manna-backup-123/manna`.

### 2.4 Đưa code lên
Từ máy của bạn, ở thư mục repo:
```bash
./deploy/deploy-api.sh ubuntu@api-origin.example.com
```
Mỗi lần chạy, script tạo một bản phát hành mới trong `/opt/manna/releases/`, trỏ `/opt/manna/current` vào đó, khởi động lại dịch vụ, kiểm tra `/api/health`, và giữ 5 bản gần nhất.

## 3. Chứng chỉ cho tên miền game
- Trong **ACM, vùng `us-east-1`** (bắt buộc với CloudFront), xin chứng chỉ cho `manna.example.com`.
- Xác minh bằng DNS.

## 4. S3 + CloudFront (CloudFormation)
```bash
aws cloudformation deploy \
  --stack-name manna-web \
  --template-file deploy/cloudfront.yaml \
  --parameter-overrides \
      DomainName=manna.example.com \
      CertificateArn=arn:aws:acm:us-east-1:123456789012:certificate/... \
      ApiOriginDomain=api-origin.example.com \
      OriginSecret='<giống ORIGIN_SECRET trên EC2>'

aws cloudformation describe-stacks --stack-name manna-web --query "Stacks[0].Outputs"
```

**Stack tạo ra:**
- Bucket S3 riêng tư, có mã hoá và chặn truy cập công khai.
- Origin Access Control (OAC) để CloudFront đọc bucket.
- Bộ header bảo mật: CSP (đã cho phép Google Sign-In và Google Fonts), HSTS, chống nhúng khung.
- CloudFront:
  - `/*` → S3, có cache.
  - `/api/*` → EC2 qua HTTPS, **không cache**, chuyển tiếp cookie, query và header.

Kiểm tra nhanh: `cfn-lint deploy/cloudfront.yaml`.

## 5. DNS và trang web
1. Trỏ `manna.example.com` về `DistributionDomain` ở phần Outputs:
   - Nếu dùng Route 53: bản ghi alias A và AAAA.
   - Nếu dùng DNS khác: bản ghi CNAME.
2. Đưa trang lên:
   ```bash
   ./deploy/deploy-web.sh <BucketName> <DistributionId>
   ```
   Script tự đổi tên bộ nhớ đệm của service worker theo commit, nên người chơi luôn nhận bản mới.
3. Kiểm tra:
   - `https://manna.example.com/api/health` trả về `{"ok":true,...}`.
   - Mở trang, bấm **Nhóm của tôi**, đăng nhập Google, **Tạo nhóm**, gửi mã mời.
   - Trên điện thoại: **Lần đầu vào nhóm** bằng mã mời, tên và PIN. Chơi một lượt, rồi mở **Bảng xếp hạng**.

## 6. Sao lưu và khôi phục
- **Sao lưu tự động:** timer `manna-backup.timer` chạy lúc 03:30 mỗi ngày. Script `deploy/backup.sh` chụp cơ sở dữ liệu bằng `VACUUM INTO` (an toàn khi đang chạy), nén, rồi đẩy lên `BACKUP_S3_URI`.
- **Nên làm:** đặt lifecycle cho bucket sao lưu, ví dụ xoá bản cũ hơn 30 ngày.
- **Chạy sao lưu ngay:** `sudo systemctl start manna-backup && journalctl -u manna-backup -n 5`
- **Khôi phục:**
  ```bash
  sudo systemctl stop manna
  aws s3 cp s3://.../manna-<thời-điểm>.db.gz /tmp/ && gunzip /tmp/manna-*.db.gz
  sudo install -o manna -g manna -m 640 /tmp/manna-<thời-điểm>.db /var/lib/manna/manna.db
  sudo rm -f /var/lib/manna/manna.db-wal /var/lib/manna/manna.db-shm
  sudo systemctl start manna
  ```

## 7. Vận hành
| Việc | Lệnh |
|---|---|
| Xem log | `journalctl -u manna -f` |
| Khởi động lại | `sudo systemctl restart manna` |
| Quay về bản trước | `sudo ln -sfn /opt/manna/releases/<bản-cũ> /opt/manna/current && sudo systemctl restart manna` |
| Đổi `ORIGIN_SECRET` | Sửa `/etc/manna/manna.env` và tham số `OriginSecret` của stack (deploy lại), rồi `sudo systemctl restart manna` |
| Cập nhật hệ điều hành / Node | `sudo apt update && sudo apt upgrade` rồi khởi động lại dịch vụ |

**Quy mô:**
- Một EC2 + SQLite đủ cho hàng nghìn người chơi; mỗi lượt chơi chỉ tạo vài yêu cầu nhỏ.
- Giới hạn tần suất đang giữ trong bộ nhớ của một tiến trình. Nếu sau này cần nhiều máy chủ, hãy chuyển sang RDS PostgreSQL và một bộ đếm chung, ví dụ ElastiCache.

## 8. Triển khai trang web bằng GitHub Actions (tuỳ chọn)
Workflow `.github/workflows/deploy-web.yml` chạy khi bạn bấm **Run workflow**. Cách cài:
1. Tạo IAM OIDC provider cho `token.actions.githubusercontent.com`.
2. Tạo role cho phép repo `taibt-devops/bible-game` assume, với quyền:
   - `s3:ListBucket`, `s3:PutObject`, `s3:DeleteObject` trên bucket web;
   - `cloudfront:CreateInvalidation` trên distribution.
3. Trong repo, vào **Settings → Variables → Actions**, thêm:
   - `AWS_ROLE_ARN`
   - `AWS_REGION`
   - `WEB_BUCKET`
   - `CF_DISTRIBUTION_ID`

## 9. Danh sách kiểm tra bảo mật
- [ ] Security Group: cổng 443 chỉ mở cho prefix list của CloudFront; cổng 22 đóng hoặc chỉ mở cho IP của bạn.
- [ ] `ORIGIN_SECRET` đã đặt (≥ 24 ký tự) và giống tham số của stack.
- [ ] `COOKIE_SECURE=1`, `NODE_ENV=production`, `SERVE_STATIC=0`.
- [ ] Bucket web không công khai; chỉ CloudFront đọc qua OAC.
- [ ] Sao lưu chạy được, và đã thử khôi phục một lần.
- [ ] Google OAuth chỉ khai báo đúng tên miền của game.
