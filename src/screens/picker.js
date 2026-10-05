// Hộp thoại chọn chủ đề và độ khó trước khi chơi.
import { VERSES, TOPICS } from "../data/verses.js";
import { LEARNED_BOX } from "../lib/progress.js";
import { MODES, LEVEL_NAMES, clampLevel } from "../modes.js";
import { store } from "../game.js";
import { go } from "../router.js";
import { esc } from "../ui/dom.js";
import { ICON } from "../ui/icons.js";
import { openModal } from "../ui/feedback.js";

export function openPicker(mode) {
  const s = store.get();
  const m = MODES[mode];
  let topic = s.last.topic;
  let level = clampLevel(s.last.level);

  const topics = [{ id: "all", name: "Tất cả" }, ...TOPICS].map((t) => {
    const list = t.id === "all" ? VERSES : VERSES.filter((v) => v.topic === t.id);
    const learned = list.filter((v) => (s.verses[v.id]?.box ?? 0) >= LEARNED_BOX).length;
    return { ...t, total: list.length, learned };
  });

  const modal = openModal({
    title: m.name,
    body: `<p class="section-title">Chủ đề</p>
      <div class="topic-grid">${topics.map((t) => `
        <button class="topic-opt" type="button" data-topic="${t.id}" aria-pressed="${t.id === topic}">
          <b>${esc(t.name)}</b><small>${t.learned}/${t.total} câu đã thuộc</small>
          <span class="bar"><i style="width:${(t.learned / t.total) * 100}%"></i></span>
        </button>`).join("")}</div>
      <p class="section-title">Độ khó</p>
      <div class="seg">${LEVEL_NAMES.map((n, i) => `<button type="button" data-level="${i + 1}" aria-pressed="${level === i + 1}">${n}</button>`).join("")}</div>
      <p class="hint-text" data-desc>${esc(m.levels[level - 1])}</p>
      <div class="actions"><button class="btn ${m.color}" type="button" data-start data-autofocus>Bắt đầu ${ICON.chev}</button></div>`,
  });
  modal.el.style.setProperty("--mode", `var(--${m.color})`);

  modal.el.addEventListener("click", (e) => {
    const t = e.target.closest("[data-topic]");
    const l = e.target.closest("[data-level]");
    if (t) {
      topic = t.dataset.topic;
      modal.el.querySelectorAll("[data-topic]").forEach((b) => b.setAttribute("aria-pressed", b === t));
    } else if (l) {
      level = Number(l.dataset.level);
      modal.el.querySelectorAll("[data-level]").forEach((b) => b.setAttribute("aria-pressed", b === l));
      modal.el.querySelector("[data-desc]").textContent = m.levels[level - 1];
    } else if (e.target.closest("[data-start]")) {
      store.update((st) => { st.last = { topic, level }; });
      modal.close();
      go(`play/${mode}`, { topic, level });
    }
  });
}
