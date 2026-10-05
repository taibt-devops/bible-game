#!/usr/bin/env bash
# Cài đặt EC2 cho Manna — chạy MỘT lần trên Ubuntu 24.04 (x86_64 hoặc arm64), với quyền root:
#   sudo bash setup-ec2.sh api-origin.example.com ban@example.com
# Trước đó: bản ghi DNS api-origin.example.com → Elastic IP của EC2, Security Group mở cổng 80 (Let's Encrypt).
set -euo pipefail
DOMAIN=${1:?"Cần tên miền origin, ví dụ api-origin.example.com"}
EMAIL=${2:?"Cần email nhận thông báo gia hạn chứng chỉ"}
HERE=$(cd "$(dirname "$0")" && pwd)

echo "==> Cài gói hệ thống"
apt-get update -y
apt-get install -y ca-certificates curl gnupg nginx certbot unzip
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 24 ]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
if ! command -v aws >/dev/null; then
  arch=$(uname -m); tmp=$(mktemp -d)
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-${arch}.zip" -o "$tmp/awscli.zip"
  unzip -q "$tmp/awscli.zip" -d "$tmp" && "$tmp/aws/install" && rm -rf "$tmp"
fi

echo "==> Người dùng và thư mục"
id manna >/dev/null 2>&1 || useradd --system --home-dir /opt/manna --shell /usr/sbin/nologin manna
install -d -o manna -g manna /opt/manna /opt/manna/releases /var/lib/manna
install -d -m 750 -o root -g manna /etc/manna
[ -f /etc/manna/manna.env ] || install -m 640 -o root -g manna "$HERE/manna.env.example" /etc/manna/manna.env

echo "==> systemd"
install -m 644 "$HERE/manna.service" "$HERE/manna-backup.service" "$HERE/manna-backup.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable manna.service manna-backup.timer

echo "==> nginx + chứng chỉ Let's Encrypt cho $DOMAIN"
install -d /var/www/certbot
cat > /etc/nginx/conf.d/websocket-map.conf <<'NGX'
map $http_upgrade $connection_upgrade { default upgrade; '' close; }
NGX
cat > /etc/nginx/sites-available/manna <<NGX
server { listen 80; listen [::]:80; server_name $DOMAIN; location /.well-known/acme-challenge/ { root /var/www/certbot; } location / { return 404; } }
NGX
ln -sf ../sites-available/manna /etc/nginx/sites-enabled/manna
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
[ -d "/etc/letsencrypt/live/$DOMAIN" ] || certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" -m "$EMAIL" --agree-tos --non-interactive
sed "s/api-origin.example.com/$DOMAIN/g" "$HERE/nginx-manna.conf" > /etc/nginx/sites-available/manna
nginx -t && systemctl reload nginx
install -d /etc/letsencrypt/renewal-hooks/deploy
printf '#!/bin/sh\nsystemctl reload nginx\n' > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

echo
echo "Xong. Việc tiếp theo:"
echo "  1. Sửa /etc/manna/manna.env (PUBLIC_ORIGIN, ORIGIN_SECRET, GOOGLE_CLIENT_ID, BACKUP_S3_URI)"
echo "  2. Từ máy của bạn: ./deploy/deploy-api.sh <user>@<ec2-host>"
