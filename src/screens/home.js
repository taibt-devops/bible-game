// Trang chủ: hồ sơ, bảng tên, 4 thẻ chế độ, câu gốc hôm nay, phòng học.
import { VERSES } from "../data/verses.js";
import { CONFIG } from "../config.js";
import { MODES } from "../modes.js";
import { store, today, todaysVerse, topicName } from "../game.js";
import { go } from "../router.js";
import { levelInfo, currentStreak, isDue } from "../lib/progress.js";
import { play, speak, canSpeak } from "../lib/sound.js";
import { esc, on, fmt } from "../ui/dom.js";
import { ICON, AVATARS } from "../ui/icons.js";
import { ART, LAMB, DOVE, SIGN_BOOK, SIGN_WHEAT } from "../ui/art.js";
import { openModal, toast } from "../ui/feedback.js";
import { openPicker } from "./picker.js";
import { openProfile, comingSoon } from "./profile.js";

const CARD_ORDER = ["fill", "order", "recall", "review"];

function profileHTML(s) {
  const day = today();
  const { level, into, need } = levelInfo(s.xp);
  const streak = currentStreak(s, day);
  return `<span class="avatar">${AVATARS[s.profile.avatar] ?? AVATARS.boy}</span>
    <span>
      <span class="pname">${esc(s.profile.name)}
        <span class="lv">${ICON.star}Lv. ${level}</span>
        <span class="streak ${streak ? "" : "off"}">${ICON.flame}${streak} ngày</span>
      </span>
      <span class="xp"><span class="bar"><i style="width:${(into / need) * 100}%"></i></span><b>${fmt(into)} / ${fmt(need)} XP</b></span>
    </span>`;
}

function dueCount(s) {
  const day = today();
  return VERSES.filter((v) => isDue(s.verses[v.id], day)).length;
}

export function homeScreen(root, _params, deco) {
  const s = store.get();
  const due = dueCount(s);
  root.innerHTML = `
  <div class="top">
    <button class="profile" type="button" data-act="profile" aria-label="Hồ sơ của bạn">${profileHTML(s)}</button>
    <div class="sign-wrap">
      <div class="sign">
        <svg class="deco" viewBox="0 0 64 64" aria-hidden="true">${SIGN_BOOK}</svg>
        <div class="title"><h1>${esc(CONFIG.appName.toUpperCase())}</h1><p>HỌC THUỘC CÂU GỐC</p></div>
        <svg class="deco" viewBox="0 0 64 64" aria-hidden="true">${SIGN_WHEAT}</svg>
      </div>
    </div>
    <nav class="tools" aria-label="Công cụ">
      <button class="tool t1" type="button" data-act="friends" data-tip="Bạn bè" aria-label="Bạn bè">${ICON.people}</button>
      <button class="tool t2" type="button" data-act="ranking" data-tip="Bảng xếp hạng" aria-label="Bảng xếp hạng">${ICON.trophy}</button>
      <button class="tool t3" type="button" data-act="sound" data-tip="Âm thanh" aria-label="Âm thanh" aria-pressed="${s.settings.sound}">${s.settings.sound ? ICON.sound : ICON.soundOff}</button>
      <button class="tool t4" type="button" data-act="settings" data-tip="Cài đặt" aria-label="Cài đặt">${ICON.gear}</button>
    </nav>
  </div>

  <section class="cards" aria-label="Chế độ chơi">
    ${CARD_ORDER.map((id, i) => {
      const m = MODES[id];
      const badge = id === "review" && due ? `<span class="due-badge" title="${due} câu cần ôn">${due}</span>` : "";
      return `<article class="card c${i + 1}">
        <div class="rings" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>${badge}
        <div class="art"><svg viewBox="0 0 160 120" aria-hidden="true">${ART[id]}</svg></div>
        <h2>${m.name}</h2>
        <p>${m.desc}</p>
        <button class="btn ${m.color}" type="button" data-mode="${id}">${m.cta} ${ICON.chev}</button>
      </article>`;
    }).join("")}
  </section>

  <footer class="foot">
    <div class="row">
      ${CONFIG.groupUrl ? `<a class="chip" href="${esc(CONFIG.groupUrl)}" target="_blank" rel="noopener">${ICON.group}Tham gia nhóm thanh niên<span class="chev">${ICON.chev}</span></a>` : ""}
      <button class="chip" type="button" data-act="votd">${ICON.scroll}Câu gốc hôm nay<span class="chev">${ICON.chev}</span></button>
      <button class="room" type="button" data-act="room">${ICON.book}<span><b>Phòng học</b><small><i class="dot"></i>Sắp ra mắt</small></span></button>
    </div>
    <p class="motto"><em>“Tôi đã giấu lời Chúa trong lòng tôi”</em> · Thi Thiên 119:11 · © ${new Date().getFullYear()} ${esc(CONFIG.appName)}</p>
  </footer>`;

  deco.innerHTML = `<svg class="mascot lamb" viewBox="0 0 220 200" aria-hidden="true">${LAMB}</svg>
    <svg class="mascot dove" viewBox="0 0 215 150" aria-hidden="true">${DOVE}</svg>`;

  const offClick = on(root, "click", "[data-act],[data-mode]", (_e, el) => {
    const mode = el.dataset.mode;
    if (mode === "review") return go("review");
    if (mode) return openPicker(mode);
    switch (el.dataset.act) {
      case "profile": return openProfile();
      case "settings": return openProfile({ focusSettings: true });
      case "friends": case "ranking": case "room": return comingSoon(el.dataset.act);
      case "votd": return openVotd();
      case "sound": {
        store.update((st) => { st.settings.sound = !st.settings.sound; });
        const onNow = store.get().settings.sound;
        el.innerHTML = onNow ? ICON.sound : ICON.soundOff;
        el.setAttribute("aria-pressed", onNow);
        if (onNow) play("tap");
        return toast(onNow ? "Đã bật âm thanh" : "Đã tắt âm thanh");
      }
    }
  });

  const offStore = store.subscribe((st) => {
    const p = root.querySelector(".profile");
    if (p) p.innerHTML = profileHTML(st);
  });

  return () => { offClick(); offStore(); };
}

export function openVotd() {
  const v = todaysVerse();
  const s = store.get();
  const done = s.stats.votdDone === today();
  const m = openModal({
    className: "scroll-sheet",
    label: "Câu gốc hôm nay",
    body: `<p class="eyebrow">Câu gốc hôm nay</p>
      <h2 class="ref-title">${esc(v.ref)}</h2>
      <blockquote class="hand">${esc(v.text)}</blockquote>
      <p class="meta">Bản Truyền Thống 1925 · Chủ đề: ${esc(topicName(v.topic))} · ${done ? "Bạn đã hoàn thành câu này hôm nay" : `Hoàn thành hôm nay để nhận thêm ${CONFIG.xp.votdBonus} XP`}</p>
      <div class="actions">
        <button class="btn red sm" type="button" data-go="order" data-autofocus>Xếp câu này</button>
        <button class="btn teal sm" type="button" data-go="recall">Thuộc lòng</button>
        ${canSpeak() ? `<button class="btn ghost sm" type="button" data-listen>${ICON.listen} Nghe</button>` : ""}
      </div>`,
  });
  m.el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-go],[data-listen]");
    if (!b) return;
    if (b.dataset.listen !== undefined) {
      if (!speak(v.text)) toast("Thiết bị chưa có giọng đọc tiếng Việt");
      return;
    }
    m.close();
    go(`play/${b.dataset.go}`, { verse: v.id });
  });
}
