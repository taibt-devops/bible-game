// Góc Ôn Tập: thẻ ghi nhớ theo lịch Leitner + thư viện câu gốc.
import { VERSES, TOPICS } from "../data/verses.js";
import { CONFIG } from "../config.js";
import { MODES } from "../modes.js";
import { reviewQueue, verseStatus, isDue, dayDiff, LEARNED_BOX } from "../lib/progress.js";
import { hintTokens, stripDiacritics } from "../lib/text.js";
import { shuffle } from "../lib/random.js";
import { play, speak, canSpeak } from "../lib/sound.js";
import { store, today, topicName, recordFlashcard } from "../game.js";
import { go } from "../router.js";
import { esc, onKey } from "../ui/dom.js";
import { ICON } from "../ui/icons.js";
import { LAMB } from "../ui/art.js";
import { openModal, toast, floatXp } from "../ui/feedback.js";
import { miniStars } from "./result.js";

const STATUS = { new: "Mới", learning: "Đang học", learned: "Đã thuộc" };

function dueLabel(entry, day) {
  if (!entry || !entry.box) return "Chưa học";
  const d = dayDiff(day, entry.due);
  if (d <= 0) return "Ôn lại: hôm nay";
  if (d === 1) return "Ôn lại: ngày mai";
  const [, m, dd] = entry.due.split("-");
  return `Ôn lại: ${Number(dd)}/${Number(m)}`;
}

function listen(text) {
  if (!speak(text)) toast("Thiết bị chưa có giọng đọc tiếng Việt");
}

export function reviewScreen(root, params) {
  let tab = params.tab === "library" ? "library" : "cards";
  let cleanupPanel = null;
  root.innerHTML = `<section class="play review">
    <div class="play-bar">
      <button class="icon-btn" type="button" data-home aria-label="Về trang chủ">${ICON.back}</button>
      <h1 style="margin:0;font:800 30px var(--f-head)">Góc Ôn Tập</h1>
    </div>
    <div class="tabs" role="tablist"></div>
    <div data-panel></div>
  </section>`;
  const tabs = root.querySelector(".tabs");
  const panel = root.querySelector("[data-panel]");
  root.querySelector("[data-home]").addEventListener("click", () => go(""));

  function paintTabs() {
    const s = store.get();
    const due = VERSES.filter((v) => isDue(s.verses[v.id], today())).length;
    tabs.innerHTML = `
      <button class="tab" role="tab" type="button" data-tab="cards" aria-selected="${tab === "cards"}">Thẻ ôn hôm nay${due ? `<span class="count">${due}</span>` : ""}</button>
      <button class="tab" role="tab" type="button" data-tab="library" aria-selected="${tab === "library"}">Thư viện</button>`;
  }

  function show() {
    cleanupPanel?.();
    paintTabs();
    cleanupPanel = tab === "cards" ? flashcards(panel, paintTabs) : library(panel);
  }

  tabs.addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (!b || b.dataset.tab === tab) return;
    tab = b.dataset.tab;
    history.replaceState(null, "", tab === "library" ? "#/review?tab=library" : "#/review");
    show();
  });

  show();
  return () => cleanupPanel?.();
}

/* ---------- thẻ ghi nhớ ---------- */

function flashcards(panel, onChange) {
  const s = store.get();
  const q = reviewQueue(VERSES, s.verses, today(), CONFIG.reviewSession);
  if (q.kind === "empty") return emptyState(panel, onChange);
  return runDeck(panel, q.list, q.kind === "due" ? `Đến hạn ôn: ${q.list.length} thẻ` : "Chưa có thẻ đến hạn. Làm quen với vài câu mới nhé!", onChange);
}

function emptyState(panel, onChange) {
  panel.innerHTML = `<div class="board empty">
    <svg viewBox="0 0 220 200" aria-hidden="true">${LAMB}</svg>
    <h3>Bạn đã ôn hết thẻ hôm nay!</h3>
    <p>Quay lại vào ngày mai, hoặc luyện thêm vài câu đã học.</p>
    <div class="flash-actions">
      <button class="btn plum" type="button" data-extra>Ôn thêm 5 câu</button>
      <button class="btn ghost" type="button" data-lib>Mở thư viện</button>
    </div></div>`;
  panel.querySelector("[data-extra]").addEventListener("click", () => {
    const st = store.get();
    const learned = VERSES.filter((v) => (st.verses[v.id]?.box ?? 0) > 0);
    runDeck(panel, shuffle(learned).slice(0, 5), "Ôn thêm ngoài lịch", onChange);
  });
  panel.querySelector("[data-lib]").addEventListener("click", () => panel.closest(".play").querySelector('[data-tab="library"]').click());
  return null;
}

function runDeck(panel, deck, heading, onChange) {
  let i = 0, known = 0, flipped = false, hint = false;
  const xpEach = CONFIG.xp.flashKnown;

  function draw() {
    if (i >= deck.length) return done();
    const v = deck[i];
    panel.innerHTML = `
      <p class="flash-meta"><span>${esc(heading)}</span><span>Thẻ ${i + 1}/${deck.length}</span></p>
      <div class="flash">
        <div class="flash-card ${flipped ? "flipped" : ""}" data-flip role="button" tabindex="0" aria-label="${flipped ? "Mặt sau" : "Mặt trước"} thẻ ${esc(v.ref)}. Nhấn để lật.">
          <div class="face front" aria-hidden="${flipped}">
            <span class="tag">${esc(topicName(v.topic))}</span>
            <span class="big-ref">${esc(v.ref)}</span>
            ${hint ? `<div class="hints">${hintTokens(v.text, 1).map((h) => `<span>${esc(h)}</span>`).join("")}</div>` : `<p class="prompt">Bạn đọc thuộc được câu này không?</p>`}
            <span class="tap">Chạm để lật thẻ</span>
          </div>
          <div class="face back" aria-hidden="${!flipped}">
            <span class="tag">${esc(v.ref)}</span>
            <p class="hand">${esc(v.text)}</p>
          </div>
        </div>
      </div>
      <div class="flash-actions">${flipped
        ? `<button class="btn red" type="button" data-ans="0">Chưa thuộc</button>
           <button class="btn green" type="button" data-ans="1">Đã thuộc</button>
           ${canSpeak() ? `<button class="btn ghost" type="button" data-listen>${ICON.listen} Nghe</button>` : ""}`
        : `<button class="btn ghost" type="button" data-hint ${hint ? "disabled" : ""}>${ICON.bulb} Gợi ý chữ đầu</button>
           <button class="btn plum" type="button" data-flipbtn>Lật thẻ</button>`}
      </div>`;
  }

  function answer(ok) {
    const v = deck[i];
    if (ok) { known++; floatXp(panel.querySelector('[data-ans="1"]'), `+${xpEach}`); }
    play(ok ? "correct" : "flip");
    recordFlashcard(v.id, ok);
    onChange();
    i++;
    flipped = false;
    hint = false;
    draw();
  }

  function done() {
    panel.innerHTML = `<div class="board empty">
      <svg viewBox="0 0 220 200" aria-hidden="true">${LAMB}</svg>
      <h3>Xong phiên ôn tập!</h3>
      <p>Đã thuộc ${known}/${deck.length} thẻ · +${known * xpEach} XP</p>
      <div class="flash-actions">
        <button class="btn plum" type="button" data-more>Ôn tiếp</button>
        <button class="btn ghost" type="button" data-home2>${ICON.home} Trang chủ</button>
      </div></div>`;
    play("complete");
    panel.querySelector("[data-more]").addEventListener("click", () => flashcards(panel, onChange));
    panel.querySelector("[data-home2]").addEventListener("click", () => go(""));
  }

  const flip = () => { flipped = !flipped; play("flip"); draw(); panel.querySelector("[data-flip]")?.focus({ preventScroll: true }); };
  const onClick = (e) => {
    if (i >= deck.length) return;
    const t = e.target.closest("[data-flip],[data-flipbtn],[data-hint],[data-ans],[data-listen]");
    if (!t) return;
    if (t.dataset.ans !== undefined) return answer(t.dataset.ans === "1");
    if (t.dataset.listen !== undefined) return listen(deck[i].text);
    if (t.dataset.hint !== undefined) { hint = true; return draw(); }
    flip();
  };
  panel.addEventListener("click", onClick);
  const offKey = onKey((e) => {
    if (i >= deck.length || e.target.closest?.("input,textarea")) return;
    if (e.key === " " && e.target.closest?.("button")) return;
    if (e.key === " " || (e.key === "Enter" && e.target.closest?.("[data-flip]"))) { e.preventDefault(); flip(); }
    else if (flipped && e.key === "1") answer(false);
    else if (flipped && e.key === "2") answer(true);
  });
  draw();
  return () => { panel.removeEventListener("click", onClick); offKey(); };
}

/* ---------- thư viện ---------- */

function library(panel) {
  let topic = "all";
  let query = "";
  panel.innerHTML = `<div class="board">
    <div class="lib-tools">
      <label class="sr" for="lib-search">Tìm câu gốc</label>
      <input id="lib-search" class="search" type="search" placeholder="Tìm theo địa chỉ hoặc nội dung…" autocomplete="off">
    </div>
    <div class="chips">${[{ id: "all", name: "Tất cả" }, ...TOPICS].map((t) => `<button class="tchip" type="button" data-topic="${t.id}" aria-pressed="${t.id === topic}">${esc(t.name)}</button>`).join("")}</div>
    <p class="lib-sum" data-sum></p>
    <div class="lib-list" data-list></div>
  </div>`;
  const list = panel.querySelector("[data-list]");
  const sum = panel.querySelector("[data-sum]");

  function paint() {
    const s = store.get();
    const day = today();
    const q = stripDiacritics(query.trim().toLowerCase());
    const shown = VERSES.filter((v) => (topic === "all" || v.topic === topic) && (!q || stripDiacritics(`${v.ref} ${v.text}`.toLowerCase()).includes(q)));
    const learned = shown.filter((v) => (s.verses[v.id]?.box ?? 0) >= LEARNED_BOX).length;
    const learning = shown.filter((v) => verseStatus(s.verses[v.id]) === "learning").length;
    sum.textContent = `${shown.length} câu · ${learned} đã thuộc · ${learning} đang học`;
    list.innerHTML = shown.length ? shown.map((v) => {
      const e = s.verses[v.id];
      const st = verseStatus(e);
      return `<button class="lib-item" type="button" data-verse="${v.id}">
        <span class="r"><span>${esc(v.ref)}</span>${miniStars(e?.box ?? 0)}</span>
        <p>${esc(v.text)}</p>
        <span class="foot-row"><span class="status ${st}">${STATUS[st]}</span><span class="tag">${esc(dueLabel(e, day))}</span></span>
      </button>`;
    }).join("") : `<p class="prompt">Không tìm thấy câu nào. Thử từ khoá khác nhé.</p>`;
  }

  panel.addEventListener("input", (e) => { if (e.target.id === "lib-search") { query = e.target.value; paint(); } });
  panel.addEventListener("click", (e) => {
    const t = e.target.closest("[data-topic]");
    if (t) {
      topic = t.dataset.topic;
      panel.querySelectorAll("[data-topic]").forEach((b) => b.setAttribute("aria-pressed", b === t));
      return paint();
    }
    const v = e.target.closest("[data-verse]");
    if (v) openVerse(VERSES.find((x) => x.id === v.dataset.verse));
  });
  paint();
  const off = store.subscribe(paint);
  return off;
}

export function openVerse(v) {
  const s = store.get();
  const e = s.verses[v.id];
  const st = verseStatus(e);
  const m = openModal({
    title: v.ref,
    body: `<div class="board-head" style="justify-content:flex-start;gap:8px">
        <span class="tag">${esc(topicName(v.topic))}</span><span class="status ${st}">${STATUS[st]}</span>${miniStars(e?.box ?? 0)}
      </div>
      <blockquote class="hand" style="margin:16px 0 0">${esc(v.text)}</blockquote>
      <p class="meta">${esc(dueLabel(e, today()))}${e?.seen ? ` · Đã luyện ${e.seen} lần, đạt ${e.correct} lần` : ""} · Bản Truyền Thống 1925</p>
      <p class="section-title">Luyện riêng câu này</p>
      <div class="actions" style="justify-content:flex-start;margin-top:0">
        ${["fill", "order", "recall"].map((id) => `<button class="btn sm ${MODES[id].color}" type="button" data-go="${id}">${MODES[id].name}</button>`).join("")}
        ${canSpeak() ? `<button class="btn sm ghost" type="button" data-listen>${ICON.listen} Nghe</button>` : ""}
      </div>`,
  });
  m.el.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-go],[data-listen]");
    if (!b) return;
    if (b.dataset.listen !== undefined) return listen(v.text);
    m.close();
    go(`play/${b.dataset.go}`, { verse: v.id });
  });
}
