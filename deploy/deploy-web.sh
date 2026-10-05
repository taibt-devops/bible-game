#!/usr/bin/env bash
# Đưa trang tĩnh (HEAD) lên S3 và làm mới CloudFront. Cần AWS CLI đã đăng nhập.
#   ./deploy/deploy-web.sh <tên-bucket> <cloudfront-distribution-id>
# (hai giá trị lấy ở phần Outputs của stack deploy/cloudfront.yaml)
set -euo pipefail
BUCKET=${1:?"Cần tên bucket"}
DIST=${2:?"Cần CloudFront distribution ID"}
cd "$(dirname "$0")/.."
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
git archive --format=tar HEAD index.html sw.js manifest.webmanifest assets styles src | tar -x -C "$TMP"
# Mỗi lần phát hành đổi tên bộ nhớ đệm của service worker để người chơi nhận code mới.
sed -i.bak "s/const VERSION = \"[^\"]*\"/const VERSION = \"manna-$(git rev-parse --short HEAD)\"/" "$TMP/sw.js" && rm -f "$TMP/sw.js.bak"

echo "==> Tải lên s3://$BUCKET"
aws s3 sync "$TMP" "s3://$BUCKET" --delete --only-show-errors \
  --exclude index.html --exclude sw.js --exclude manifest.webmanifest \
  --cache-control "public, max-age=300"
aws s3 cp "$TMP/index.html" "s3://$BUCKET/index.html" --only-show-errors --cache-control "no-cache" --content-type "text/html; charset=utf-8"
aws s3 cp "$TMP/sw.js" "s3://$BUCKET/sw.js" --only-show-errors --cache-control "no-cache" --content-type "text/javascript; charset=utf-8"
aws s3 cp "$TMP/manifest.webmanifest" "s3://$BUCKET/manifest.webmanifest" --only-show-errors --cache-control "no-cache" --content-type "application/manifest+json"

echo "==> Làm mới CloudFront $DIST"
aws cloudfront create-invalidation --distribution-id "$DIST" --paths "/*" --query "Invalidation.Id" --output text
echo "==> Xong."
