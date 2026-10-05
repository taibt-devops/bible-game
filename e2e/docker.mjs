// Kiểm thử trình duyệt với bản Docker đang chạy (docker compose up -d): npm run test:docker
import { browser, errors, log, assert, newPage, shot, playFill } from "./helpers.mjs";
const BASE = process.env.BASE_URL || "http://localhost:8080/";
const step = process.argv[2] || "play";
try {
  const page = await newPage({ width: 1366, height: 860 });
  await page.goto(BASE);
  await page.waitForSelector(".card");
  if (step === "play") {
    await page.click('[data-act="friends"]');
    await page.click('[data-mode="join"]');
    await page.fill("#f-code", "MANNA7");
    await page.fill("#f-name", "Bé Na");
    await page.fill("#f-pin", "2468");
    await page.click("[data-submit]");
    await page.waitForFunction(() => document.querySelector(".pgroup")?.textContent.includes("Nhóm thử Manna"));
    log("Vào nhóm MANNA7 qua Docker OK");
    await page.goto(BASE + "#/play/fill?topic=love&level=1");
    await page.waitForSelector(".opt");
    await playFill(page);
    await page.waitForFunction(() => JSON.parse(localStorage.getItem("manna.v3")).sync.pending.length === 0);
    await page.goto(BASE);
    await page.waitForSelector(".card");
    await page.click('[data-act="ranking"]');
    await page.waitForSelector(".lb li.me");
    await page.waitForTimeout(300);
    await shot(page, "31-docker-leaderboard");
    const xp = await page.locator(".lb li.me .pts").textContent();
    log("Chơi 1 lượt, bảng xếp hạng:", xp);
  } else {
    await page.click('[data-act="friends"]');
    await page.fill("#f-code", "MANNA7");
    await page.fill("#f-name", "Bé Na");
    await page.fill("#f-pin", "2468");
    await page.click("[data-submit]");
    await page.waitForFunction(() => JSON.parse(localStorage.getItem("manna.v3")).xp > 0);
    log("Sau khi khởi động lại container, đăng nhập lại vẫn còn XP:", await page.evaluate(() => JSON.parse(localStorage.getItem("manna.v3")).xp));
  }
  assert(!errors.length, "Lỗi JS:\n" + errors.join("\n"));
} catch (e) {
  console.error("LỖI:", e.message, errors.join("\n"));
  process.exitCode = 1;
} finally {
  await browser.close();
}
