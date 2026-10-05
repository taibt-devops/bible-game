// Chế độ Xếp Câu: sắp các mảnh về đúng thứ tự.
import { VERSES } from "../data/verses.js";
import { CONFIG } from "../config.js";
import { clampLevel, LEVEL_NAMES } from "../modes.js";
import { pickRound } from "../lib/progress.js";
import { chunkVerse, scramble, correctPrefix } from "../lib/text.js";
import { shuffle } from "../lib/random.js";
import { play } from "../lib/sound.js";
import { store, today, topicName, finishRound } from "../game.js";
import { go } from "../router.js";
import { esc } from "../ui/dom.js";
import { ICON } from "../ui/icons.js";
import { floatXp } from "../ui/feedback.js";
import { mountRound } from "./round.js";
import { renderResult } from "./result.js";

export function orderScreen(root, params) {
  const s = store.get();
  const level = clampLevel(params.level ?? s.last.level);
  const verses = pickRound(VERSES, s.verses, { count: CONFIG.roundSize.order, topic: params.topic ?? "all", level, today: today(), onlyId: params.verse });
  if (!verses.length) return go("");

  let idx = 0, total = 0, touched = false, busy = false;
  const results = [];
  let cur;
  const ui = mountRound(root, { mode: "order", total: verses.length, isDirty: () => touched });

  function startVerse() {
    const v = verses[idx];
    const chunks = chunkVerse(v.text, level);
    cur = { v, chunks, bank: scramble(chunks), answer: [], errors: 0, hinted: new Set(), wrong: new Set(), done: false };
    ui.progress(idx);
    draw();
  }

  const tile = (t, where) =>
    `<button class="tile ${cur.wrong.has(t.id) ? "wrong" : ""} ${cur.hinted.has(t.id) ? "hinted" : ""} ${cur.done ? "locked" : ""}" type="button" data-${where}="${t.id}" ${cur.done || busy ? "disabled" : ""}>${esc(t.text)}</button>`;

  function draw() {
    const { v, answer, bank } = cur;
    ui.stage.innerHTML = `<div class="board">
      <div class="board-head"><span class="ref">${esc(v.ref)}</span><span class="tag">${esc(topicName(v.topic))} · ${LEVEL_NAMES[level - 1]}</span></div>
      <p class="prompt">Chạm vào các mảnh theo đúng thứ tự của câu gốc.</p>
      <div class="answer" data-empty="Chạm vào mảnh bên dưới để bắt đầu" aria-label="Câu đang xếp">${answer.map((t) => tile(t, "a")).join("")}</div>
      <div class="bank" aria-label="Các mảnh">${bank.map((t) => tile(t, "b")).join("")}</div>
      <div class="row-between">
        <button class="btn ghost sm" type="button" data-hint ${cur.done || busy ? "disabled" : ""}>${ICON.bulb} Gợi ý</button>
        <span class="tag">${cur.errors ? `Sai ${cur.errors} lần` : "Chưa sai lần nào"}</span>
      </div></div>`;
  }

  function move(from, to, id) {
    const i = from.findIndex((t) => t.id === id);
    if (i >= 0) to.push(...from.splice(i, 1));
  }

  function check() {
    const p = correctPrefix(cur.answer.map((t) => t.text), cur.chunks);
    if (p === cur.chunks.length) return success();
    cur.errors++;
    play("wrong");
    cur.answer.forEach((t, i) => { if (t.text !== cur.chunks[i]) cur.wrong.add(t.id); });
    busy = true;
    draw();
    ui.stage.querySelector(".answer").classList.add("shake");
    setTimeout(() => {
      busy = false;
      cur.bank = shuffle(cur.answer.splice(p));
      cur.wrong.clear();
      draw();
    }, 900);
  }

  function success() {
    cur.done = true;
    const clean = !cur.errors && !cur.hinted.size;
    const gain = clean ? CONFIG.xp.orderClean : CONFIG.xp.orderAssisted;
    total += gain;
    ui.xp(total);
    results.push({ id: cur.v.id, success: clean, xp: gain });
    play("correct");
    draw();
    floatXp(ui.stage.querySelector(".answer"), `+${gain}`);
    ui.progress(idx + 1);
    const last = idx + 1 >= verses.length;
    ui.feedback({
      ok: true,
      title: clean ? "Chính xác ngay lần đầu!" : "Xếp xong rồi!",
      text: `${cur.v.ref} · +${gain} XP${clean ? "" : " (lần sau thử không cần gợi ý nhé)"}`,
      next: last ? "Xem kết quả" : "Tiếp tục",
      onNext: () => {
        idx++;
        if (!last) return startVerse();
        const summary = finishRound(results);
        const firstTry = results.filter((r) => r.success).length;
        renderResult(root, { mode: "order", params, summary, results, extraStat: { value: `${firstTry}`, label: "Đúng ngay lần đầu" } });
      },
    });
  }

  function hint() {
    const p = correctPrefix(cur.answer.map((t) => t.text), cur.chunks);
    cur.bank.push(...cur.answer.splice(p));
    const next = cur.bank.find((t) => t.text === cur.chunks[p]);
    cur.hinted.add(next.id);
    move(cur.bank, cur.answer, next.id);
    touched = true;
    play("tap");
    if (!cur.bank.length) return check();
    draw();
  }

  const onClick = (e) => {
    if (busy || cur.done) return;
    const b = e.target.closest("[data-b],[data-a],[data-hint]");
    if (!b) return;
    touched = true;
    if (b.dataset.hint !== undefined) return hint();
    if (b.dataset.b !== undefined) move(cur.bank, cur.answer, Number(b.dataset.b));
    else move(cur.answer, cur.bank, Number(b.dataset.a));
    play("tap");
    if (!cur.bank.length) return check();
    draw();
  };
  root.addEventListener("click", onClick);

  startVerse();
  return () => root.removeEventListener("click", onClick);
}
