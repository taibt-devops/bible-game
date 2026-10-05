// Kiểm thử khói: mở app trong Chromium, chơi thử mọi chế độ, kiểm tra không có lỗi JS.
// Chạy: npm run test:e2e   (cần cài playwright: npm i -D playwright && npx playwright install chromium)
// Biến môi trường: SHOTS=thư-mục-lưu-ảnh, CHROMIUM=đường-dẫn-trình-duyệt, FONT_DIR=thư-mục-font-đã-tải
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { VERSES } from "../src/data/verses.js";
import { splitWords, wordParts, chunkVerse } from "../src/lib/text.js";

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

const byRef = Object.fromEntries(VERSES.map((v) => [v.ref, v]));
const errors = [];
const log = (...a) => console.log("•", ...a);
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});

async function newPage(viewport) {
  const page = await browser.newPage({ viewport });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !/fonts\.(googleapis|gstatic)/.test(m.text()) && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`); });
  if (process.env.FONT_DIR) {
    const dir = process.env.FONT_DIR;
    await page.route("https://fonts.googleapis.com/**", (r) => r.fulfill({ contentType: "text/css", body: fs.readFileSync(path.join(dir, "fonts.css")) }));
    await page.route("https://fonts.gstatic.com/**", (r) => {
      const f = path.join(dir, crypto.createHash("md5").update(r.request().url() + "\n").digest("hex").slice(0, 12) + ".woff2");
      return fs.existsSync(f) ? r.fulfill({ contentType: "font/woff2", body: fs.readFileSync(f) }) : r.abort();
    });
  } else {
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  }
  return page;
}

async function shot(page, name) {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
}

async function noOverflow(page, where) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert(over <= 1, `${where}: tràn ngang ${over}px`);
}

async function playFill(page, { wrongFirst = false } = {}) {
  let wrongDone = !wrongFirst;
  for (let guard = 0; guard < 60; guard++) {
    if (await page.locator(".result").count()) return;
    const next = page.locator("[data-next]");
    if (await next.count()) { await next.click(); continue; }
    const now = page.locator(".blank.now");
    if (!(await now.count())) { await page.waitForTimeout(150); continue; }
    const ref = (await page.locator(".ref").textContent()).trim();
    const i = Number(await now.getAttribute("data-i"));
    const answer = wordParts(splitWords(byRef[ref].text)[i]).core;
    const opts = page.locator(".opt:not([disabled])");
    const texts = await opts.evaluateAll((els) => els.map((e) => e.lastChild.textContent));
    let pick = texts.indexOf(answer);
    if (!wrongDone) { pick = (pick + 1) % texts.length; wrongDone = true; }
    await opts.nth(pick).click();
    await page.waitForTimeout(1100);
  }
  throw new Error("Điền Từ không kết thúc");
}

async function playOrder(page, { useHint = false } = {}) {
  for (let guard = 0; guard < 120; guard++) {
    if (await page.locator(".result").count()) return;
    const next = page.locator("[data-next]");
    if (await next.count()) { await next.click(); continue; }
    if (useHint) { await page.locator("[data-hint]").click(); useHint = false; continue; }
    const ref = (await page.locator(".ref").textContent()).trim();
    const placed = await page.locator(".answer .tile").count();
    const bank = page.locator(".bank .tile");
    const texts = await bank.allTextContents();
    const level = Number(new URL(page.url()).hash.match(/level=(\d)/)?.[1] ?? 2);
    const target = chunkVerse(byRef[ref].text, level)[placed];
    await bank.nth(texts.indexOf(target)).click();
  }
  throw new Error("Xếp Câu không kết thúc");
}

async function playRecall(page, { lazy = false } = {}) {
  for (let guard = 0; guard < 20; guard++) {
    if (await page.locator(".result").count()) return;
    const next = page.locator("[data-next]");
    if (await next.count()) { await next.click(); continue; }
    const ref = (await page.locator(".ref").textContent()).trim();
    const text = byRef[ref].text;
    await page.fill("#recall-input", lazy ? text.split(" ").slice(0, 4).join(" ") : text.toLowerCase());
    lazy = false;
    await page.click("[data-check]");
  }
  throw new Error("Thuộc Lòng không kết thúc");
}

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
  const xp1 = await page.evaluate(() => JSON.parse(localStorage.getItem("manna.v2")).xp);
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
