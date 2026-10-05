// Màn hình kết quả sau mỗi lượt.
import { roundStars, currentStreak } from "../lib/progress.js";
import { MODES } from "../modes.js";
import { store, today, verseById, badgeById } from "../game.js";
import { go } from "../router.js";
import { play } from "../lib/sound.js";
import { esc, fmt, reducedMotion } from "../ui/dom.js";
import { ICON, BADGE_ICON } from "../ui/icons.js";
import { LAMB } from "../ui/art.js";
import { burst } from "../ui/feedback.js";
import { openPicker } from "./picker.js";

const TITLES = ["Đừng bỏ cuộc!", "Khá lắm!", "Làm tốt lắm!", "Tuyệt vời!"];

export function miniStars(box = 0) {
  return `<span class="mini-stars" aria-label="${box} trên 5 sao">${"★".repeat(box)}<i>${"★".repeat(5 - box)}</i></span>`;
}

export function renderResult(root, { mode, params, summary, results, extraStat }) {
  const s = store.get();
  const stars = roundStars(summary.successes, summary.count);
  const { level, into, need } = summary.levelAfter;
  const news = [];
  if (summary.leveledUp) news.push(`${ICON.star} Lên cấp ${level}!`);
  if (summary.goalReached) news.push(`${ICON.goal} Đạt mục tiêu ngày`);
  if (summary.votdHit) news.push(`${ICON.scroll} +${summary.bonus} XP câu gốc hôm nay`);
  for (const id of summary.badges) {
    const b = badgeById(id);
    news.push(`${BADGE_ICON[b.icon]} Huy hiệu: ${esc(b.name)}`);
  }
  const single = !!params.verse;
  const m = MODES[mode];

  root.innerHTML = `<section class="result">
    <div class="board">
      <svg class="result-mascot" viewBox="0 0 220 200" aria-hidden="true">${LAMB}</svg>
      <div class="stars" aria-label="${stars} trên 3 sao">${[0, 1, 2].map((i) => (i < stars ? ICON.star : ICON.starEmpty)).join("")}</div>
      <h2>${TITLES[stars]}</h2>
      <div class="xp-big" data-count="${summary.total}">+${summary.total} XP</div>
      <p class="xp-note">${m.name} · ${summary.successes}/${summary.count} câu đạt</p>
      <div class="stat-row">
        <div class="stat"><b>${summary.successes}/${summary.count}</b><span>Câu đạt</span></div>
        <div class="stat"><b>${esc(extraStat.value)}</b><span>${esc(extraStat.label)}</span></div>
        <div class="stat"><b>${currentStreak(s, today())}</b><span>Chuỗi ngày</span></div>
      </div>
      <div class="lvl">
        <div class="lvl-top"><span>Cấp ${level}</span><span>${fmt(into)} / ${fmt(need)} XP</span></div>
        <span class="bar"><i style="width:${(into / need) * 100}%"></i></span>
      </div>
      ${news.length ? `<div class="news">${news.map((n) => `<span>${n}</span>`).join("")}</div>` : ""}
      <ul class="vlist">${results.map((r) => {
        const v = verseById(r.id);
        return `<li><span class="mark ${r.success ? "" : "no"}">${r.success ? ICON.check : ICON.cross}</span>
          <span class="r">${esc(v.ref)}</span>${miniStars(s.verses[r.id]?.box ?? 0)}</li>`;
      }).join("")}</ul>
      <div class="actions">
        <button class="btn ${m.color}" type="button" data-again data-autofocus>${single ? "Luyện lại" : "Chơi tiếp"} ${ICON.refresh}</button>
        ${single ? "" : `<button class="btn ghost" type="button" data-topic>Đổi chủ đề</button>`}
        <button class="btn ghost" type="button" data-home>${ICON.home} Trang chủ</button>
      </div>
    </div>
  </section>`;

  play(stars ? "complete" : "flip");
  if (summary.leveledUp) setTimeout(() => play("level"), 700);
  if (stars === 3) setTimeout(() => burst(root.querySelector(".stars"), 26), 350);

  const xpEl = root.querySelector(".xp-big");
  if (!reducedMotion() && summary.total > 0) {
    const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / 900);
      xpEl.textContent = `+${Math.round(summary.total * (1 - (1 - k) ** 3))} XP`;
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  root.querySelector("[data-again]").addEventListener("click", () => go(`play/${mode}`, params));
  root.querySelector("[data-topic]")?.addEventListener("click", () => openPicker(mode));
  root.querySelector("[data-home]").addEventListener("click", () => go(""));
  root.querySelector("[data-again]").focus({ preventScroll: true });
}
