#!/usr/bin/env bash
# Sao lưu nhất quán (VACUUM INTO, an toàn khi đang chạy) rồi đẩy lên S3.
set -euo pipefail
: "${DB_PATH:?thiếu DB_PATH}" "${BACKUP_S3_URI:?thiếu BACKUP_S3_URI}"
ts=$(date -u +%Y%m%dT%H%M%SZ)
out="$(dirname "$DB_PATH")/backup-$ts.db"
trap 'rm -f "$out" "$out.gz"' EXIT
node --disable-warning=ExperimentalWarning -e '
  const { DatabaseSync } = require("node:sqlite");
  const db = new DatabaseSync(process.argv[1], { readOnly: true });
  db.prepare("VACUUM INTO ?").run(process.argv[2]);
  db.close();
' "$DB_PATH" "$out"
gzip -9 "$out"
aws s3 cp "$out.gz" "$BACKUP_S3_URI/manna-$ts.db.gz" --only-show-errors
echo "Đã sao lưu: $BACKUP_S3_URI/manna-$ts.db.gz"
