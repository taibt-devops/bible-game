// Chế độ Điền Từ: chọn từ còn thiếu trong câu gốc.
import { VERSES } from "../data/verses.js";
import { CONFIG } from "../config.js";
import { clampLevel } from "../modes.js";
import { pickRound } from "../lib/progress.js";
import { splitWords, wordParts, normalizeWord, matchCase, blankCount, chooseBlanks, buildWordPool, pickDistractors } from "../lib/text.js";
import { shuffle } from "../lib/random.js";
import { play } from "../lib/sound.js";
import { store, today, topicName, finishRound } from "../game.js";
import { go } from "../router.js";
import { esc, onKey } from "../ui/dom.js";
import { floatXp } from "../ui/feedback.js";
import { mountRound } from "./round.js";
import { renderResult } from "./result.js";

let pool;

export function fillScreen(root, params) {
  const s = store.get();
  const level = clampLevel(params.level ?? s.last.level);
  const verses = pickRound(VERSES, s.verses, { count: CONFIG.roundSize.fill, topic: params.topic ?? "all", level, today: today(), onlyId: params.verse });
  if (!verses.length) return go("");
  pool ??= buildWordPool(VERSES);

  let idx = 0, total = 0, combo = 0, bestCombo = 0, answered = 0, busy = false;
  const results = [];
  let cur;
  const ui = mountRound(root, { mode: "fill", total: verses.length, isDirty: () => answered > 0 });

  function startVerse() {
    const v = verses[idx];
    const words = splitWords(v.text);
    cur = { v, words, blanks: chooseBlanks(words, blankCount(v.words, level)), k: 0, marks: {}, allOk: true, xp: 0, options: [] };
    ui.progress(idx);
    draw();
  }

  function draw() {
    const { v, words, blanks, k, marks } = cur;
    const html = words.map((w, i) => {
      if (!blanks.includes(i)) return esc(w);
      const { lead, core, trail } = wordParts(w);
      const st = marks[i] ?? (i === blanks[k] ? "now" : "");
      return `${esc(lead)}<span class="blank ${st}" data-i="${i}">${marks[i] ? esc(core) : "&nbsp;"}</span>${esc(trail)}`;
    }).join(" ");
    let opts = "";
    if (k < blanks.length) {
      const answer = wordParts(words[blanks[k]]).core;
      cur.options = shuffle([answer, ...pickDistractors(answer, pool, words).map((d) => matchCase(d, answer))]);
      opts = `<div class="options" role="group" aria-label="Các lựa chọn">${cur.options.map((o, j) =>
        `<button class="opt" type="button" data-opt="${j}"><span class="key">${j + 1}</span>${esc(o)}</button>`).join("")}</div>`;
    }
    ui.stage.innerHTML = `<div class="board">
      ${combo >= 3 ? `<span class="combo">Combo ×${combo}</span>` : ""}
      <div class="board-head"><span class="ref">${esc(v.ref)}</span><span class="tag">${esc(topicName(v.topic))}</span></div>
      <p class="prompt">${k < blanks.length ? `Chọn từ cho ô màu vàng (${k + 1}/${blanks.length}).` : "Đọc lại cả câu một lần nhé."}</p>
      <p class="verse">${html}</p>${opts}</div>`;
  }

  function choose(j) {
    if (busy || !cur.options[j]) return;
    busy = true;
    answered++;
    const blankIdx = cur.blanks[cur.k];
    const answer = wordParts(cur.words[blankIdx]).core;
    const ok = normalizeWord(cur.options[j]) === normalizeWord(answer);
    const buttons = [...ui.stage.querySelectorAll(".opt")];
    buttons.forEach((b) => (b.disabled = true));
    buttons[j].classList.add(ok ? "ok" : "bad");
    const blankEl = ui.stage.querySelector(`.blank[data-i="${blankIdx}"]`);
    blankEl.classList.remove("now");
    blankEl.classList.add(ok ? "ok" : "bad");
    blankEl.textContent = answer;
    cur.marks[blankIdx] = ok ? "ok" : "bad";
    if (ok) {
      combo++;
      bestCombo = Math.max(bestCombo, combo);
      const gain = CONFIG.xp.fillBlank + (combo >= 3 ? CONFIG.xp.combo : 0);
      cur.xp += gain;
      total += gain;
      ui.xp(total);
      floatXp(buttons[j], `+${gain}`);
      play("correct");
    } else {
      combo = 0;
      cur.allOk = false;
      buttons[cur.options.findIndex((o) => normalizeWord(o) === normalizeWord(answer))]?.classList.add("ok");
      blankEl.classList.add("shake");
      play("wrong");
    }
    setTimeout(() => {
      busy = false;
      cur.k++;
      if (cur.k < cur.blanks.length) draw();
      else verseDone();
    }, ok ? 550 : 1000);
  }

  function verseDone() {
    draw();
    results.push({ id: cur.v.id, success: cur.allOk, xp: cur.xp });
    ui.progress(idx + 1);
    const last = idx + 1 >= verses.length;
    ui.feedback({
      ok: cur.allOk,
      title: cur.allOk ? "Chính xác!" : "Chưa đúng hết",
      text: cur.allOk ? `${cur.v.ref} · +${cur.xp} XP` : "Ô màu đỏ là đáp án đúng. Lần sau sẽ nhớ hơn!",
      next: last ? "Xem kết quả" : "Tiếp tục",
      onNext: () => {
        idx++;
        if (!last) return startVerse();
        const summary = finishRound(results);
        renderResult(root, { mode: "fill", params, summary, results, extraStat: { value: `×${bestCombo}`, label: "Combo cao nhất" } });
      },
    });
  }

  const offClick = (e) => {
    const b = e.target.closest("[data-opt]");
    if (b && !b.disabled) choose(Number(b.dataset.opt));
  };
  root.addEventListener("click", offClick);
  const offKey = onKey((e) => {
    if (/^[1-4]$/.test(e.key)) choose(Number(e.key) - 1);
  });

  startVerse();
  return () => { offKey(); root.removeEventListener("click", offClick); };
}
