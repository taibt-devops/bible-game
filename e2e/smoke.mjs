// Kiểm thử khói: mở app (không có máy chủ API) trong Chromium, chơi thử mọi chế độ, kiểm tra không có lỗi JS.
// Chạy: npm run test:e2e   (cần cài playwright: npm i -D playwright && npx playwright install chromium)
// Biến môi trường: SHOTS=thư-mục-lưu-ảnh, CHROMIUM=đường-dẫn-trình-duyệt, FONT_DIR=thư-mục-font-đã-tải
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { browser, errors, log, assert, newPage, shot, noOverflow, playFill, playOrder, playRecall } from "./helpers.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = process.env.SHOTS;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png" };

const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  const file = fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, "index.html") : p;
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

try {
  const page = await newPage({ width: 1366, height: 860 });
  await page.goto(BASE);
  await page.waitForSelector(".card");
  assert((await page.locator(".card").count()) === 4, "trang chủ phải có 4 thẻ");
  await shot(page, "01-home");
  log("Trang chủ OK");

  await page.click('[data-mode="fill"]');
  await page.waitForSelector(".topic-grid");
  await page.waitForTimeout(400);
  await shot(page, "02-picker");
  await page.click('[data-topic="love"]');
  await page.click('[data-level="2"]');
  await page.click("[data-start]");
  await page.waitForSelector(".opt");
  await shot(page, "03-fill");
  await playFill(page, { wrongFirst: true });
  await page.waitForTimeout(1200);
  await shot(page, "04-fill-result");
  const xp1 = await page.evaluate(() => JSON.parse(localStorage.getItem("manna.v3")).xp);
  assert(xp1 > 0, "Điền Từ phải cộng XP");
  log("Điền Từ OK, XP =", xp1);

  await page.goto(BASE + "#/play/order?topic=peace&level=2");
  await page.waitForSelector(".bank .tile");
  await shot(page, "05-order");
  await playOrder(page, { useHint: true });
  log("Xếp Câu OK");

  await page.goto(BASE + "#/play/recall?topic=word&level=1");
  await page.waitForSelector("#recall-input");
  await shot(page, "06-recall");
  await playRecall(page, { lazy: true });
  await page.waitForTimeout(1200);
  await shot(page, "07-recall-result");
  log("Thuộc Lòng OK");

  await page.goto(BASE + "#/review");
  await page.waitForSelector(".flash-card");
  await page.click("[data-hint]");
  await page.click("[data-flipbtn]");
  await page.waitForTimeout(600);
  await shot(page, "08-flashcard");
  await page.click('[data-ans="1"]');
  await page.click('[data-tab="library"]');
  await page.fill("#lib-search", "den cho chon");
  assert((await page.locator(".lib-item").count()) === 1, "tìm không dấu phải ra Thi Thiên 119:105");
  await page.click(".lib-item");
  await page.waitForTimeout(400);
  await shot(page, "09-verse-modal");
  await page.keyboard.press("Escape");
  log("Góc Ôn Tập OK");

  await page.goto(BASE);
  await page.click('[data-act="profile"]');
  await page.fill("#name-input", "Gia Ân");
  await page.press("#name-input", "Tab");
  await page.click('[data-toggle="bigText"]');
  await page.waitForTimeout(400);
  await shot(page, "10-profile");
  await page.keyboard.press("Escape");
  assert((await page.locator(".pname").textContent()).includes("Gia Ân"), "đổi tên phải cập nhật trang chủ");
  await page.click('[data-act="votd"]');
  await page.click('[data-go="order"]');
  await page.waitForSelector(".bank .tile");
  await playOrder(page);
  log("Hồ sơ + câu gốc hôm nay OK");
  await page.close();

  const phone = await newPage({ width: 390, height: 844 });
  await phone.goto(BASE);
  await phone.waitForSelector(".card");
  await noOverflow(phone, "trang chủ (điện thoại)");
  await shot(phone, "11-phone-home");
  await phone.goto(BASE + "#/play/fill?topic=courage&level=3");
  await phone.waitForSelector(".opt");
  await noOverflow(phone, "Điền Từ (điện thoại)");
  await shot(phone, "12-phone-fill");
  await phone.goto(BASE + "#/play/order?topic=hope&level=3");
  await phone.waitForSelector(".bank .tile");
  await noOverflow(phone, "Xếp Câu (điện thoại)");
  await shot(phone, "13-phone-order");
  await phone.goto(BASE + "#/review?tab=library");
  await phone.waitForSelector(".lib-item");
  await noOverflow(phone, "Thư viện (điện thoại)");
  log("Điện thoại OK");

  assert(!errors.length, "Lỗi JS:\n" + errors.join("\n"));
  console.log("\nTẤT CẢ ĐỀU ỔN");
} catch (e) {
  console.error("\nLỖI:", e.message);
  if (errors.length) console.error(errors.join("\n"));
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
