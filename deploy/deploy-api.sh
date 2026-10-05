#!/usr/bin/env bash
# Đưa bản code hiện tại (HEAD) lên EC2 và khởi động lại dịch vụ. Chạy từ thư mục repo trên máy bạn:
#   ./deploy/deploy-api.sh ubuntu@api-origin.example.com
# Mỗi lần triển khai là một thư mục mới trong /opt/manna/releases; giữ 5 bản gần nhất để quay lại nhanh.
set -euo pipefail
HOST=${1:?"Cần địa chỉ SSH, ví dụ ubuntu@api-origin.example.com"}
cd "$(dirname "$0")/.."
REL="/opt/manna/releases/$(date -u +%Y%m%d%H%M%S)-$(git rev-parse --short HEAD)"
echo "==> Gửi $(git rev-parse --short HEAD) lên $HOST:$REL"
# shellcheck disable=SC2029 # $REL được mở rộng ở máy của bạn (có chủ ý)
git archive --format=tar HEAD server src package.json deploy | ssh "$HOST" "
  set -e
  sudo install -d -o manna -g manna '$REL'
  sudo tar -x -C '$REL'
  sudo chown -R manna:manna '$REL'
  sudo ln -sfn '$REL' /opt/manna/current
  sudo systemctl restart manna
  for i in 1 2 3 4 5 6 7 8 9 10; do curl -fsS http://127.0.0.1:8787/api/health && break; sleep 1; done
  echo
  ls -1dt /opt/manna/releases/* | tail -n +6 | sudo xargs -r rm -rf
"
echo "==> Xong. Xem log: ssh $HOST 'journalctl -u manna -n 50 --no-pager'"
