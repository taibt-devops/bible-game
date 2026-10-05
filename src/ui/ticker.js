// Dải "Hôm nay" chạy chữ ở đầu trang.
import { allVerses } from "../data/catalog.js";
import { currentStreak, todayXp, learnedCount, isDue } from "../lib/progress.js";
import { today, todaysVerse, weeklyVerse } from "../game.js";
import { account } from "../net/account.js";
import { fmt } from "./dom.js";
import { esc } from "./dom.js";
import { ICON } from "./icons.js";

const goalPill = (xp, goal) =>
  xp >= goal
    ? `<span class="pill">${ICON.goal} Đã đạt mục tiêu hôm nay (${xp} XP)</span>`
    : `<span class="pill">${ICON.goal} Mục tiêu ${xp}/${goal} XP</span>`;

const MEDAL = [ICON.medal("#e3a425", "#c2412d"), ICON.medal("#b9c2cc", "#4f87a6"), ICON.medal("#c98a52", "#3f8a3a")];

export function renderTicker(s) {
  const day = today();
  const due = allVerses().filter((v) => isDue(s.verses[v.id], day)).length;
  const top = account.me?.group ? account.top : [];
  document.querySelector(".ticker .label").innerHTML = `${ICON.crown}${top.length ? "BẢNG VÀNG TUẦN" : "HÔM NAY"}`;
  const items = [
    top.length ? `<span>Chúc mừng các bạn dẫn đầu tuần này:</span>${top.map((r) => `<span class="pill">${MEDAL[r.rank - 1] ?? ""} #${r.rank} <b>${esc(r.name)}</b> ${fmt(r.xp)} XP</span>`).join("")}` : "",
    `<span>${weeklyVerse() ? "Câu gốc tuần" : "Câu gốc hôm nay"}: <span class="pill"><b>${esc(todaysVerse().ref)}</b></span></span>`,
    goalPill(todayXp(s, day), s.settings.dailyGoal),
    `<span class="pill">${ICON.flame} Chuỗi ${currentStreak(s, day)} ngày</span>`,
    `<span class="pill">${ICON.scroll} Đã thuộc ${learnedCount(s.verses)}/${allVerses().length} câu</span>`,
    due ? `<span class="pill">${ICON.bulb} Cần ôn ${due} câu</span>` : "",
    `<span>“Tôi đã giấu lời Chúa trong lòng tôi.” — Thi Thiên 119:11</span>`,
  ].join("");
  document.getElementById("ticker").innerHTML = items + items;
}
