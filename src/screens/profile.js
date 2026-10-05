// Hồ sơ, cài đặt, và các tính năng sắp ra mắt.
import { allVerses } from "../data/catalog.js";
import { CONFIG } from "../config.js";
import { levelInfo, currentStreak, learnedCount, BADGES } from "../lib/progress.js";
import { play } from "../lib/sound.js";
import { store, today } from "../game.js";
import { esc, fmt } from "../ui/dom.js";
import { ICON, AVATARS, AVATAR_NAMES, BADGE_ICON } from "../ui/icons.js";
import { DOVE } from "../ui/art.js";
import { openModal, toast, busy } from "../ui/feedback.js";
import { go } from "../router.js";
import { account, updateMe, logout, deleteAccount, linkGoogle } from "../net/account.js";
import { renderGoogleButton, googleEnabled } from "../net/google.js";
import { openAccount } from "./account.js";

function statsHTML(s) {
  const { level } = levelInfo(s.xp);
  const items = [
    [`${level}`, "Cấp"],
    [fmt(s.xp), "Tổng XP"],
    [`${learnedCount(s.verses)}/${allVerses().length}`, "Câu đã thuộc"],
    [`${currentStreak(s, today())}`, "Chuỗi hiện tại"],
    [`${s.bestStreak}`, "Kỷ lục chuỗi"],
    [`${s.stats.rounds}`, "Lượt đã chơi"],
  ];
  return `<div class="stats-grid">${items.map(([b, t]) => `<div class="stat"><b>${b}</b><span>${t}</span></div>`).join("")}</div>`;
}

function accountHTML() {
  const me = account.me;
  if (!me) {
    return `<div class="acct-box"><p><b>Chưa đăng nhập.</b> Đăng nhập để lưu tiến độ lên mạng, học trên nhiều máy và vào bảng xếp hạng của nhóm.</p>
      <button class="btn green sm" type="button" data-acct>Đăng nhập / Vào nhóm</button></div>`;
  }
  const how = [me.user.hasPin ? "mã nhóm + PIN" : "", me.user.hasGoogle ? `Google${me.user.email ? ` (${esc(me.user.email)})` : ""}` : ""].filter(Boolean).join(" và ");
  return `<div class="acct-box"><p>Đăng nhập bằng ${how}${me.group ? ` · Nhóm <b>${esc(me.group.name)}</b>${me.user.role === "leader" ? " (nhóm trưởng)" : ""}` : " · Chưa vào nhóm"}.
      ${account.online ? "" : "<br>Đang mất kết nối, tiến độ sẽ gửi lên khi có mạng."}</p>
    <div class="inline">
      <button class="btn green sm" type="button" data-group>${me.group ? "Nhóm của tôi" : "Chọn nhóm"}</button>
      <button class="btn ghost sm" type="button" data-logout>Đăng xuất</button>
    </div>
    ${!me.user.hasGoogle && googleEnabled() ? `<p class="form-hint">Liên kết Google để đăng nhập trên máy khác mà không cần mã nhóm và PIN:</p><div class="gbtn left" data-link-google></div>` : ""}
    <p class="form-error" data-acct-err hidden></p></div>`;
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
      <p class="section-title">Tài khoản</p>
      ${accountHTML()}
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
        ${account.me
          ? `<p>Xoá tài khoản cùng toàn bộ tiến độ trên máy chủ và trên máy này. Không thể hoàn tác.</p>
             <button class="btn red sm" type="button" data-reset>Xoá tài khoản</button>`
          : `<p>Xoá toàn bộ tiến độ trên thiết bị này (XP, câu đã thuộc, huy hiệu). Không thể hoàn tác.</p>
             <button class="btn red sm" type="button" data-reset>Xoá tiến độ</button>`}
      </div>`,
  });

  const nameInput = m.el.querySelector("#name-input");
  nameInput.addEventListener("change", async () => {
    const name = nameInput.value.trim().slice(0, 20) || "Bạn trẻ";
    nameInput.value = name;
    if (!account.me) return store.update((st) => { st.profile.name = name; });
    try {
      await updateMe({ name });
      toast("Đã đổi tên");
    } catch (err) {
      nameInput.value = store.get().profile.name;
      toast(err.message);
    }
  });
  const acctErr = m.el.querySelector("[data-acct-err]");
  const linkBox = m.el.querySelector("[data-link-google]");
  if (linkBox) renderGoogleButton(linkBox, async (credential) => {
    try {
      await linkGoogle(credential);
      toast("Đã liên kết Google", { tone: "good", icon: ICON.check });
      m.close();
      openProfile();
    } catch (err) {
      acctErr.textContent = err.message;
      acctErr.hidden = false;
    }
  });

  m.el.addEventListener("click", (e) => {
    const av = e.target.closest("[data-avatar]");
    const tg = e.target.closest("[data-toggle]");
    const goal = e.target.closest("[data-goal]");
    if (e.target.closest("[data-acct]")) {
      m.close();
      return openAccount();
    }
    if (e.target.closest("[data-group]")) {
      m.close();
      return openAccount();
    }
    const out = e.target.closest("[data-logout]");
    if (out) {
      return busy(out, acctErr, async () => {
        await logout();
        m.close();
        toast("Đã đăng xuất. Tiến độ vẫn nằm trong tài khoản của bạn.");
        go("");
      });
    }
    if (av) {
      if (account.me) updateMe({ avatar: av.dataset.avatar }).catch((err) => toast(err.message));
      else store.update((st) => { st.profile.avatar = av.dataset.avatar; });
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
      box.innerHTML = `<p><b>Chắc chắn xoá hết?</b> ${account.me ? "Tài khoản và mọi tiến độ sẽ bị xoá vĩnh viễn." : "Mọi tiến độ trên thiết bị này sẽ mất."}</p>
        <div class="actions" style="justify-content:flex-start;margin-top:0">
          <button class="btn ghost sm" type="button" data-cancel-reset>Giữ lại</button>
          <button class="btn red sm" type="button" data-confirm-reset>Xoá hết</button></div>`;
      box.querySelector("[data-cancel-reset]").focus();
    } else if (e.target.closest("[data-cancel-reset]")) {
      m.close();
      openProfile({ focusSettings: true });
    } else if (e.target.closest("[data-confirm-reset]")) {
      const btn = e.target.closest("[data-confirm-reset]");
      if (account.me) {
        busy(btn, null, async () => {
          await deleteAccount();
          m.close();
          toast("Đã xoá tài khoản.");
          go("");
        });
        return;
      }
      store.reset();
      m.close();
      toast("Đã xoá tiến độ. Bắt đầu lại nào!");
      go("");
    }
  });

  if (focusSettings) m.el.querySelector("#settings-title").scrollIntoView({ block: "start" });
}

const SOON = {
  room: { title: "Phòng học", text: "Sắp ra mắt: phòng học trực tuyến, nơi bạn thấy ai đang online và rủ nhau thi đấu xếp câu gốc." },
};

export function comingSoon(kind) {
  const c = SOON[kind];
  openModal({
    title: c.title,
    body: `<div class="soon"><svg class="big" viewBox="0 0 215 150" aria-hidden="true">${DOVE}</svg><p>${esc(c.text)}</p></div>
      <div class="actions" style="justify-content:center"><button class="btn green sm" type="button" data-close>Đã hiểu</button></div>`,
  });
}
