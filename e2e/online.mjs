// Kiểm thử trình duyệt với máy chủ API thật (cơ sở dữ liệu tạm): vào nhóm bằng PIN, đồng bộ,
// bảng xếp hạng, nhóm trưởng chọn câu gốc tuần từ Kinh Thánh, đặt lại PIN, đăng xuất.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { browser, errors, log, assert, newPage, shot, byRef, playFill, playOrder } from "./helpers.mjs";
import { openDb } from "../server/db.js";
import { hashPin, nameKey } from "../server/auth.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "manna-e2e-"));
const dbPath = path.join(tmp, "manna.db");

// Dựng sẵn một nhóm có nhóm trưởng dùng PIN (trên thực tế nhóm trưởng tạo nhóm bằng Google).
const db = openDb(dbPath);
const gid = db.prepare("INSERT INTO groups (code, name, created_at) VALUES ('TEST01', 'Thanh niên Ân Điển', ?)").run(Date.now()).lastInsertRowid;
db.prepare("INSERT INTO users (group_id, name, name_key, role, pin_hash, created_at) VALUES (?, 'Anh Tú', ?, 'leader', ?, ?)").run(gid, nameKey("Anh Tú"), hashPin("1111"), Date.now());
db.close();

const port = 18000 + Math.floor(Math.random() * 2000);
const server = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server/index.js"], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", DB_PATH: dbPath, SERVE_STATIC: "1", NODE_ENV: "development", GOOGLE_CLIENT_ID: "" },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverLog = "";
server.stdout.on("data", (d) => { serverLog += d; });
server.stderr.on("data", (d) => { serverLog += d; });
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error(`Máy chủ không khởi động:\n${serverLog}`)), 10000);
  server.stdout.on("data", () => { if (serverLog.includes("đang chạy")) { clearTimeout(t); resolve(); } });
});
const BASE = `http://127.0.0.1:${port}/`;

const apiGet = (page, p) => page.evaluate((u) => fetch(u, { credentials: "same-origin" }).then((r) => r.json()), `/api${p}`);

async function signIn(page, { join = false, code = "TEST01", name, pin }) {
  await page.click('[data-act="friends"]');
  await page.waitForSelector("#f-code");
  if (join) await page.click('[data-mode="join"]');
  await page.fill("#f-code", code);
  await page.fill("#f-name", name);
  await page.fill("#f-pin", pin);
  await page.click("[data-submit]");
  await page.waitForFunction((n) => document.querySelector(".pname")?.textContent.toLowerCase().includes(n), name.toLowerCase());
}

async function signOut(page) {
  await page.click('[data-act="profile"]');
  await page.click("[data-logout]");
  await page.waitForFunction(() => !document.querySelector(".overlay"));
}

try {
  const page = await newPage({ width: 1366, height: 860 });
  await page.goto(BASE);
  await page.waitForSelector(".card");
  await page.waitForFunction(() => document.querySelector(".pgroup")?.textContent.includes("Chưa đăng nhập"));
  log("Máy chủ chạy, trang nhận ra chưa đăng nhập");

  // 1. Chơi khi chưa đăng nhập: tiến độ nằm trên máy.
  await page.goto(BASE + "#/play/fill?topic=love&level=1");
  await page.waitForSelector(".opt");
  await playFill(page);
  const localXp = await page.evaluate(() => JSON.parse(localStorage.getItem("manna.v3")).xp);
  assert(localXp > 0, "chơi khi chưa đăng nhập phải có XP trên máy");

  // 2. Vào nhóm bằng mã + tên + PIN: tiến độ trên máy được đưa lên tài khoản.
  await page.goto(BASE);
  await signIn(page, { join: true, name: "Gia Ân", pin: "2468" });
  await page.waitForFunction(() => document.querySelector(".pgroup")?.textContent.includes("Thanh niên Ân Điển"));
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("manna.v3")).sync.pending.length === 0);
  const me = await apiGet(page, "/me");
  assert(me.user.name === "Gia Ân" && me.group.code === "TEST01", "vào nhóm thành công");
  const lb = await apiGet(page, "/leaderboard?period=week");
  assert(lb.rows.find((r) => r.me).xp === localXp, `XP trên máy (${localXp}) phải lên bảng xếp hạng`);
  await page.waitForFunction(() => document.querySelector(".ticker .label").textContent.includes("BẢNG VÀNG"));
  await shot(page, "21-home-signed-in");
  log("Vào nhóm bằng PIN, đồng bộ XP lên máy chủ OK, XP =", localXp);

  await page.click('[data-act="ranking"]');
  await page.waitForSelector(".lb li.me");
  await page.waitForTimeout(300);
  await shot(page, "22-leaderboard");
  await page.keyboard.press("Escape");
  log("Bảng xếp hạng OK");

  // 3. Đăng xuất: tiến độ trên máy được xoá (đã nằm trong tài khoản).
  await signOut(page);
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem("manna.v3")));
  assert(after.xp === 0 && after.sync.pending.length === 0, "đăng xuất xoá tiến độ trên máy");
  assert((await apiGet(page, "/me")).error, "đã đăng xuất");
  log("Đăng xuất OK");

  // 4. Nhóm trưởng: chọn câu gốc tuần trong Kinh Thánh (Ma-thi-ơ 5:14-15), đặt lại PIN cho thành viên.
  await signIn(page, { name: "Anh Tú", pin: "1111" });
  await page.click('[data-act="friends"]');
  await page.waitForSelector(".members .member");
  await shot(page, "23-group-members");
  await page.click('[data-tab="weekly"]');
  await page.waitForSelector('[data-k="book"]');
  await page.selectOption('[data-k="book"]', "40");
  await page.selectOption('[data-k="chapter"]', "5");
  await page.selectOption('[data-k="from"]', "14");
  await page.selectOption('[data-k="to"]', "15");
  await page.waitForSelector("[data-set-bible]:not([disabled])");
  const preview = await page.locator("[data-preview]").textContent();
  assert(preview.includes("Ma-thi-ơ 5:14-15") && preview.includes("sự sáng của thế gian"), "xem trước đúng đoạn Kinh Thánh");
  await shot(page, "24-weekly-picker");
  await page.click("[data-set-bible]");
  await page.waitForSelector(".weekly-card");
  await page.click('[data-tab="members"]');
  const row = page.locator(".member", { hasText: "Gia Ân" });
  await row.locator('[data-act="pin"]').click();
  await row.locator("input").fill("9753");
  await row.locator('button[type="submit"]').click();
  await page.waitForFunction(() => document.querySelector("#toast")?.textContent.includes("PIN mới"));
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.querySelector(".ticker")?.textContent.includes("Câu gốc tuần"));
  log("Nhóm trưởng đặt câu gốc tuần + đặt lại PIN OK");
  await signOut(page);

  // 5. Thành viên đăng nhập bằng PIN mới, học câu gốc tuần (câu ngoài bộ chung), XP và tiến độ được khôi phục.
  await signIn(page, { name: "gia ân", pin: "9753" });
  await page.waitForFunction((x) => JSON.parse(localStorage.getItem("manna.v3")).xp === x, localXp);
  log("Đăng nhập lại, tiến độ được khôi phục từ máy chủ");
  await page.click('[data-act="votd"]');
  await page.waitForSelector(".scroll-sheet");
  const weeklyText = await page.locator(".scroll-sheet .hand").textContent();
  assert((await page.locator(".scroll-sheet .ref-title").textContent()) === "Ma-thi-ơ 5:14-15", "câu gốc tuần thay câu gốc hôm nay");
  byRef["Ma-thi-ơ 5:14-15"] = { text: weeklyText };
  await shot(page, "25-weekly-verse");
  await page.click('[data-go="order"]');
  await page.waitForSelector(".bank .tile");
  await playOrder(page);
  await page.waitForTimeout(1200);
  await shot(page, "26-weekly-result");
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("manna.v3")).sync.pending.length === 0);
  const lb2 = await apiGet(page, "/leaderboard?period=week");
  assert(lb2.rows.find((r) => r.me).xp > localXp, "lượt chơi câu gốc tuần được cộng lên máy chủ (kèm thưởng)");
  log("Học câu gốc tuần, đồng bộ OK");

  assert(!errors.length, "Lỗi JS:\n" + errors.join("\n"));
  console.log("\nTẤT CẢ ĐỀU ỔN (có máy chủ)");
} catch (e) {
  console.error("\nLỖI:", e.message);
  if (errors.length) console.error(errors.join("\n"));
  console.error("--- log máy chủ ---\n" + serverLog.slice(-2000));
  process.exitCode = 1;
} finally {
  await browser.close();
  server.kill();
  fs.rmSync(tmp, { recursive: true, force: true });
}
