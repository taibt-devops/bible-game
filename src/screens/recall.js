// Chế độ Thuộc Lòng: gõ lại cả câu từ trí nhớ.
import { VERSES } from "../data/verses.js";
import { CONFIG } from "../config.js";
import { clampLevel } from "../modes.js";
import { pickRound } from "../lib/progress.js";
import { splitWords, hintTokens, gradeRecall } from "../lib/text.js";
import { play } from "../lib/sound.js";
import { store, today, topicName, finishRound } from "../game.js";
import { go } from "../router.js";
import { esc } from "../ui/dom.js";
import { ICON } from "../ui/icons.js";
import { toast } from "../ui/feedback.js";
import { mountRound } from "./round.js";
import { renderResult } from "./result.js";

const PROMPTS = [
  "Gõ lại cả câu. Gợi ý là chữ cái đầu của mỗi từ, kèm dấu câu.",
  "Gõ lại cả câu. Gợi ý là chữ cái đầu của mỗi từ.",
  "Gõ lại cả câu. Mỗi ô là một từ, không có gợi ý chữ.",
];

export function recallScreen(root, params) {
  const s = store.get();
  const level = clampLevel(params.level ?? s.last.level);
  const verses = pickRound(VERSES, s.verses, { count: CONFIG.roundSize.recall, topic: params.topic ?? "all", level, today: today(), onlyId: params.verse });
  if (!verses.length) return go("");

  let idx = 0, total = 0, touched = false, peekTimer;
  const results = [];
  const ui = mountRound(root, { mode: "recall", total: verses.length, isDirty: () => touched || idx > 0 });

  function startVerse() {
    const v = verses[idx];
    let peeked = false;
    ui.progress(idx);
    ui.stage.innerHTML = `<div class="board">
      <div class="board-head"><span class="ref">${esc(v.ref)}</span><span class="tag">${esc(topicName(v.topic))} · ${v.words} từ</span></div>
      <p class="prompt">${PROMPTS[level - 1]}</p>
      <div class="hints" aria-hidden="true">${hintTokens(v.text, level).map((h) => `<span>${esc(h)}</span>`).join("")}</div>
      <div class="peek" data-peek hidden></div>
      <label class="sr" for="recall-input">Gõ câu gốc ${esc(v.ref)}</label>
      <textarea id="recall-input" class="recall-input" placeholder="Gõ câu gốc từ trí nhớ…" autocomplete="off" autocapitalize="sentences" spellcheck="false"></textarea>
      <div class="counter" data-counter>0 / ${v.words} từ</div>
      <div class="row-between">
        <button class="btn ghost sm" type="button" data-peekbtn>${ICON.eye} Xem câu (−${CONFIG.xp.peekPenalty} XP)</button>
        <button class="btn teal" type="button" data-check>Kiểm tra ${ICON.check}</button>
      </div></div>`;
    const input = ui.stage.querySelector("textarea");
    const counter = ui.stage.querySelector("[data-counter]");
    const peekBox = ui.stage.querySelector("[data-peek]");
    const peekBtn = ui.stage.querySelector("[data-peekbtn]");
    input.focus({ preventScroll: true });

    input.addEventListener("input", () => {
      touched = true;
      counter.textContent = `${splitWords(input.value).length} / ${v.words} từ`;
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); }
    });
    peekBtn.addEventListener("click", () => {
      peeked = true;
      touched = true;
      peekBtn.disabled = true;
      let left = CONFIG.peekSeconds;
      const show = () => { peekBox.innerHTML = `<p class="hand" style="font-size:var(--verse-size)">${esc(v.text)}</p><p class="meta">Ẩn sau ${left} giây</p>`; };
      peekBox.hidden = false;
      show();
      clearInterval(peekTimer);
      peekTimer = setInterval(() => {
        left--;
        if (left > 0) return show();
        clearInterval(peekTimer);
        peekBox.hidden = true;
        input.focus({ preventScroll: true });
      }, 1000);
    });
    ui.stage.querySelector("[data-check]").addEventListener("click", submit);

    function submit() {
      if (!splitWords(input.value).length) {
        input.classList.add("shake");
        setTimeout(() => input.classList.remove("shake"), 400);
        return toast("Hãy gõ câu gốc trước nhé");
      }
      clearInterval(peekTimer);
      const g = gradeRecall(v.text, input.value, { lenient: store.get().settings.lenient, pass: CONFIG.recallPass });
      const gain = Math.max(0, Math.round(g.score * CONFIG.xp.recallMax) - (peeked ? CONFIG.xp.peekPenalty : 0));
      const success = g.pass && !peeked;
      total += gain;
      ui.xp(total);
      results.push({ id: v.id, success, xp: gain });
      play(g.pass ? "correct" : "wrong");
      const pct = Math.round(g.score * 100);
      ui.stage.innerHTML = `<div class="board">
        <div class="board-head"><span class="ref">${esc(v.ref)}</span><span class="tag">${esc(topicName(v.topic))}</span></div>
        <div class="score"><b>${pct}%</b><span class="prompt">${g.pass ? "giống câu gốc" : `cần đạt ${Math.round(CONFIG.recallPass * 100)}%`}</span></div>
        <p class="verse diff">${splitWords(v.text).map((w, i) => `<span class="${g.matched.has(i) ? "hit" : "miss"}">${esc(w)}</span>`).join(" ")}</p>
        <p class="typed"><b>Bạn đã gõ:</b> ${esc(input.value.trim())}</p>
      </div>`;
      ui.progress(idx + 1);
      const last = idx + 1 >= verses.length;
      ui.feedback({
        ok: g.pass,
        title: g.pass ? (peeked ? "Đạt rồi, lần sau thử không xem nhé!" : "Thuộc rồi!") : "Gần được rồi!",
        text: `+${gain} XP${g.pass ? "" : " · Từ gạch chân đỏ là chỗ còn thiếu"}`,
        next: last ? "Xem kết quả" : "Tiếp tục",
        onNext: () => {
          idx++;
          if (!last) return startVerse();
          const summary = finishRound(results);
          renderResult(root, { mode: "recall", params, summary, results, extraStat: { value: `${results.filter((r) => r.success).length}`, label: "Câu thuộc lòng" } });
        },
      });
    }
  }

  startVerse();
  return () => clearInterval(peekTimer);
}
