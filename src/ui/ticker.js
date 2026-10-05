// Dải "Hôm nay" chạy chữ ở đầu trang.
import { VERSES } from "../data/verses.js";
import { currentStreak, todayXp, learnedCount, isDue } from "../lib/progress.js";
import { today, todaysVerse } from "../game.js";
import { esc } from "./dom.js";
import { ICON } from "./icons.js";

const goalPill = (xp, goal) =>
  xp >= goal
    ? `<span class="pill">${ICON.goal} Đã đạt mục tiêu hôm nay (${xp} XP)</span>`
    : `<span class="pill">${ICON.goal} Mục tiêu ${xp}/${goal} XP</span>`;

export function renderTicker(s) {
  const day = today();
  const due = VERSES.filter((v) => isDue(s.verses[v.id], day)).length;
  const items = [
    `<span>Câu gốc hôm nay: <span class="pill"><b>${esc(todaysVerse().ref)}</b></span></span>`,
    goalPill(todayXp(s, day), s.settings.dailyGoal),
    `<span class="pill">${ICON.flame} Chuỗi ${currentStreak(s, day)} ngày</span>`,
    `<span class="pill">${ICON.scroll} Đã thuộc ${learnedCount(s.verses)}/${VERSES.length} câu</span>`,
    due ? `<span class="pill">${ICON.bulb} Cần ôn ${due} câu</span>` : "",
    `<span>“Tôi đã giấu lời Chúa trong lòng tôi.” — Thi Thiên 119:11</span>`,
  ].join("");
  document.getElementById("ticker").innerHTML = items + items;
}
