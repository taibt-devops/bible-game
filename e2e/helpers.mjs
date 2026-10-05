// Hàm dùng chung cho các kiểm thử trình duyệt.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright";
import { VERSES } from "../src/data/verses.js";
import { splitWords, wordParts, chunkVerse } from "../src/lib/text.js";

export const SHOTS = process.env.SHOTS;
export const errors = [];
export const log = (...a) => console.log("•", ...a);
export const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
export const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});

// Văn bản câu theo địa chỉ hiển thị; extra cho các câu ngoài bộ chung (câu gốc tuần).
export const byRef = Object.fromEntries(VERSES.map((v) => [v.ref, v]));


export async function newPage(viewport) {
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

export async function shot(page, name) {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
}

export async function noOverflow(page, where) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert(over <= 1, `${where}: tràn ngang ${over}px`);
}

export async function playFill(page, { wrongFirst = false } = {}) {
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

export async function playOrder(page, { useHint = false } = {}) {
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

export async function playRecall(page, { lazy = false } = {}) {
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

