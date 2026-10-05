// Phục vụ trang tĩnh khi chạy ở máy dev (trên AWS, trang tĩnh nằm ở S3 + CloudFront).
import fs from "node:fs";
import path from "node:path";

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".webmanifest": "application/manifest+json",
};

export function serveStatic(req, res, pathname, root) {
  let rel;
  try { rel = decodeURIComponent(pathname); } catch { rel = "/"; }
  const file = path.resolve(root, `.${rel.endsWith("/") ? `${rel}index.html` : rel}`);
  const allowed = file.startsWith(path.resolve(root) + path.sep) && !/[\\/](server|node_modules|\.git|scripts|tests|e2e|deploy)[\\/]/.test(file.slice(path.resolve(root).length));
  if (!allowed || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    return res.end("Không tìm thấy.");
  }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream", "cache-control": "no-cache" });
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(file).pipe(res);
}
