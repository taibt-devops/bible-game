// Hồ sơ, cài đặt, và các tính năng sắp ra mắt.
import { VERSES } from "../data/verses.js";
import { CONFIG } from "../config.js";
import { levelInfo, currentStreak, learnedCount, BADGES } from "../lib/progress.js";
import { play } from "../lib/sound.js";
import { store, today } from "../game.js";
import { esc, fmt } from "../ui/dom.js";
import { ICON, AVATARS, AVATAR_NAMES, BADGE_ICON } from "../ui/icons.js";
import { DOVE } from "../ui/art.js";
import { openModal, toast } from "../ui/feedback.js";
import { go } from "../router.js";

function statsHTML(s) {
  const { level } = levelInfo(s.xp);
  const items = [
    [`${level}`, "Cấp"],
    [fmt(s.xp), "Tổng XP"],
    [`${learnedCount(s.verses)}/${VERSES.length}`, "Câu đã thuộc"],
    [`${currentStreak(s, today())}`, "Chuỗi hiện tại"],
    [`${s.bestStreak}`, "Kỷ lục chuỗi"],
    [`${s.stats.rounds}`, "Lượt đã chơi"],
  ];
  return `<div class="stats-grid">${items.map(([b, t]) => `<div class="stat"><b>${b}</b><span>${t}</span></div>`).join("")}</div>`;
}

const toggle = (key, title, sub, on) => `<div class="setting"><span><b>${title}</b><small>${sub}</small></span>
  <button class="switch" type="button" role="switch" aria-checked="${on}" data-toggle="${key}" aria-label="${esc(title)}"></button></div>`;

export function openProfile({ focusSettings = false } = {}) {
  const s = store.get();
  const m = openModal({
    title: "Hồ sơ của bạn",
    className: "wide",
    body: `
      <div class="prof-head">
        <span class="avatar" data-avatar-preview>${AVATARS[s.profile.avatar] ?? AVATARS.boy}</span>
        <div style="flex:1;min-width:0">
          <label class="sr" for="name-input">Tên hiển thị</label>
          <input id="name-input" class="name-input" maxlength="20" value="${esc(s.profile.name)}" autocomplete="nickname">
          <div class="avatars" role="group" aria-label="Chọn ảnh đại diện">${Object.keys(AVATARS).map((k) =>
            `<button class="avatar-opt" type="button" data-avatar="${k}" aria-pressed="${k === s.profile.avatar}" aria-label="${AVATAR_NAMES[k]}">${AVATARS[k]}</button>`).join("")}</div>
        </div>
      </div>
      <p class="section-title">Thành tích</p>
      ${statsHTML(s)}
      <p class="section-title">Huy hiệu (${Object.keys(s.badges).length}/${BADGES.length})</p>
      <div class="badges">${BADGES.map((b) => `<div class="badge ${s.badges[b.id] ? "" : "locked"}" title="${esc(b.desc)}">
        ${BADGE_ICON[b.icon]}<b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div>`).join("")}</div>
      <p class="section-title" id="settings-title">Cài đặt</p>
      ${toggle("sound", "Âm thanh", "Tiếng khi chọn đúng, sai và hoàn thành", s.settings.sound)}
      ${toggle("lenient", "Không bắt buộc gõ dấu", "Thuộc Lòng chấp nhận “Loi Chua” như “Lời Chúa”", s.settings.lenient)}
      ${toggle("bigText", "Chữ câu gốc lớn", "Dễ đọc hơn trên điện thoại", s.settings.bigText)}
      <div class="setting"><span><b>Mục tiêu mỗi ngày</b><small>Số XP cần đạt để giữ thói quen</small></span>
        <div class="seg small">${CONFIG.dailyGoals.map((g) => `<button type="button" data-goal="${g}" aria-pressed="${g === s.settings.dailyGoal}">${g} XP</button>`).join("")}</div></div>
      <div class="danger" data-danger>
        <p>Xoá toàn bộ tiến độ trên thiết bị này (XP, câu đã thuộc, huy hiệu). Không thể hoàn tác.</p>
        <button class="btn red sm" type="button" data-reset>Xoá tiến độ</button>
      </div>`,
  });

  const nameInput = m.el.querySelector("#name-input");
  nameInput.addEventListener("change", () => {
    const name = nameInput.value.trim().slice(0, 20) || "Bạn trẻ";
    nameInput.value = name;
    store.update((st) => { st.profile.name = name; });
  });

  m.el.addEventListener("click", (e) => {
    const av = e.target.closest("[data-avatar]");
    const tg = e.target.closest("[data-toggle]");
    const goal = e.target.closest("[data-goal]");
    if (av) {
      store.update((st) => { st.profile.avatar = av.dataset.avatar; });
      m.el.querySelectorAll("[data-avatar]").forEach((b) => b.setAttribute("aria-pressed", b === av));
      m.el.querySelector("[data-avatar-preview]").innerHTML = AVATARS[av.dataset.avatar];
      play("tap");
    } else if (tg) {
      const key = tg.dataset.toggle;
      store.update((st) => { st.settings[key] = !st.settings[key]; });
      tg.setAttribute("aria-checked", store.get().settings[key]);
      play("tap");
    } else if (goal) {
      store.update((st) => { st.settings.dailyGoal = Number(goal.dataset.goal); });
      m.el.querySelectorAll("[data-goal]").forEach((b) => b.setAttribute("aria-pressed", b === goal));
    } else if (e.target.closest("[data-reset]")) {
      const box = m.el.querySelector("[data-danger]");
      box.innerHTML = `<p><b>Chắc chắn xoá hết?</b> Mọi tiến độ trên thiết bị này sẽ mất.</p>
        <div class="actions" style="justify-content:flex-start;margin-top:0">
          <button class="btn ghost sm" type="button" data-cancel-reset>Giữ lại</button>
          <button class="btn red sm" type="button" data-confirm-reset>Xoá hết</button></div>`;
      box.querySelector("[data-cancel-reset]").focus();
    } else if (e.target.closest("[data-cancel-reset]")) {
      m.close();
      openProfile({ focusSettings: true });
    } else if (e.target.closest("[data-confirm-reset]")) {
      store.reset();
      m.close();
      toast("Đã xoá tiến độ. Bắt đầu lại nào!");
      go("");
    }
  });

  if (focusSettings) m.el.querySelector("#settings-title").scrollIntoView({ block: "start" });
}

const SOON = {
  friends: { title: "Bạn bè", text: "Sắp ra mắt: kết bạn với các bạn trong nhóm thanh niên, xem bạn đang học câu nào và cổ vũ nhau mỗi ngày." },
  ranking: { title: "Bảng xếp hạng", text: "Sắp ra mắt: bảng xếp hạng tuần của nhóm. Trong lúc chờ, đây là thành tích của bạn:" },
  room: { title: "Phòng học", text: "Sắp ra mắt: phòng học trực tuyến, nơi bạn thấy ai đang online và rủ nhau thi đấu xếp câu gốc." },
};

export function comingSoon(kind) {
  const c = SOON[kind];
  const s = store.get();
  openModal({
    title: c.title,
    body: `<div class="soon"><svg class="big" viewBox="0 0 215 150" aria-hidden="true">${DOVE}</svg><p>${esc(c.text)}</p></div>
      ${kind === "ranking" ? `<div style="margin-top:14px">${statsHTML(s)}</div>` : ""}
      <div class="actions" style="justify-content:center"><button class="btn green sm" type="button" data-close>Đã hiểu</button></div>`,
  });
}
