// Nhóm thanh niên: thành viên, câu gốc tuần, công cụ nhóm trưởng.
import { VERSES, TOPICS } from "../data/verses.js";
import {
  account, isLeader, groupDetails, renameGroup, newGroupCode, leaveGroup, resetMemberPin, removeMember, setMemberRole,
  setWeeklyVerse, clearWeeklyVerse, bibleBooks, passage,
} from "../net/account.js";
import { dayDiff } from "../lib/progress.js";
import { today } from "../game.js";
import { go } from "../router.js";
import { esc, fmt } from "../ui/dom.js";
import { ICON, AVATARS } from "../ui/icons.js";
import { openModal, toast, busy } from "../ui/feedback.js";

let booksCache = null;

function lastSeen(day) {
  if (!day) return "Chưa học";
  const d = dayDiff(day, today());
  if (d <= 0) return "Học hôm nay";
  if (d === 1) return "Học hôm qua";
  return `Học ${d} ngày trước`;
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Đã sao chép mã mời", { tone: "good", icon: ICON.check });
  } catch {
    toast(`Mã mời: ${text}`);
  }
}

export function openGroup({ tab = "members", justCreated = false } = {}) {
  const m = openModal({ title: account.me?.group?.name ?? "Nhóm", className: "wide", body: `<div data-body><p class="prompt">Đang tải…</p></div>` });
  const body = m.el.querySelector("[data-body]");
  let data = null;

  async function load() {
    try {
      data = await groupDetails();
      m.el.querySelector(".sheet-head h2").textContent = data.group.name;
      render();
    } catch (e) {
      body.innerHTML = `<p class="form-error">${esc(e.message)}</p>`;
    }
  }

  function render() {
    const leader = data.me.role === "leader";
    const tabs = [["members", "Thành viên"], ["weekly", "Câu gốc tuần"], ["settings", leader ? "Quản lý nhóm" : "Tuỳ chọn"]];
    body.innerHTML = `
      ${justCreated ? `<p class="notice">Đã tạo nhóm! Gửi <b>mã mời</b> bên dưới cho các bạn để vào nhóm.</p>` : ""}
      <div class="code-row">
        <span>Mã mời</span><b class="code">${esc(data.group.code)}</b>
        <button class="btn ghost sm" type="button" data-copy>Sao chép</button>
        <span class="tag">${data.group.members} thành viên</span>
      </div>
      <div class="tabs small" role="tablist">${tabs.map(([id, label]) => `<button class="tab" role="tab" type="button" data-tab="${id}" aria-selected="${tab === id}">${label}</button>`).join("")}</div>
      <div data-panel></div>`;
    body.querySelector("[data-copy]").addEventListener("click", () => copy(data.group.code));
    body.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { tab = b.dataset.tab; justCreated = false; render(); }));
    const panel = body.querySelector("[data-panel]");
    if (tab === "members") members(panel, leader);
    else if (tab === "weekly") weekly(panel, leader);
    else settings(panel, leader);
  }

  /* ---------- thành viên ---------- */
  function members(panel, leader) {
    panel.innerHTML = `<ul class="members">${data.members.map((x) => {
      const me = x.id === data.me.id;
      return `<li class="member" data-id="${x.id}">
        <span class="avatar sm">${AVATARS[x.avatar] ?? AVATARS.boy}</span>
        <span class="who"><b>${esc(x.name)}</b>${x.role === "leader" ? `<span class="tag lead">Nhóm trưởng</span>` : ""}${me ? `<span class="tag">Bạn</span>` : ""}
          <small>Tuần này ${fmt(x.weekXp)} XP · ${lastSeen(x.lastDay)}</small></span>
        ${leader && !me ? `<span class="row-actions">
          ${x.hasPin ? `<button class="btn ghost sm" type="button" data-act="pin">Đặt lại PIN</button>` : ""}
          <button class="btn ghost sm" type="button" data-act="role">${x.role === "leader" ? "Bỏ nhóm trưởng" : "Cử nhóm trưởng"}</button>
          <button class="btn ghost sm danger-btn" type="button" data-act="remove">Mời ra</button>
        </span>` : ""}
        <div class="inline-panel" data-inline hidden></div>
      </li>`;
    }).join("")}</ul>
    ${leader ? `<p class="form-hint">Bạn quên PIN? Nhóm trưởng bấm “Đặt lại PIN” rồi báo PIN mới cho bạn.</p>` : ""}`;

    panel.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      const li = b.closest(".member");
      const x = data.members.find((y) => y.id === Number(li.dataset.id));
      const box = li.querySelector("[data-inline]");
      box.hidden = false;
      if (b.dataset.act === "pin") {
        box.innerHTML = `<form class="inline" data-f><label class="sr" for="np-${x.id}">PIN mới cho ${esc(x.name)}</label>
          <input id="np-${x.id}" class="field" inputmode="numeric" maxlength="6" placeholder="PIN mới 4–6 số">
          <button class="btn green sm" type="submit">Lưu PIN</button><button class="btn ghost sm" type="button" data-cancel>Huỷ</button></form>
          <p class="form-error" data-e hidden></p>`;
        box.querySelector("input").focus();
        box.querySelector("[data-f]").addEventListener("submit", (ev) => {
          ev.preventDefault();
          busy(ev.submitter, box.querySelector("[data-e]"), async () => {
            await resetMemberPin(x.id, box.querySelector("input").value.trim());
            box.hidden = true;
            toast(`Đã đặt PIN mới cho ${x.name}. Hãy báo PIN này cho bạn ấy.`, { tone: "good", icon: ICON.check, ms: 4000 });
          });
        });
      } else {
        const remove = b.dataset.act === "remove";
        const text = remove
          ? `Mời ${x.name} ra khỏi nhóm?${x.hasGoogle ? "" : " Tài khoản chỉ dùng PIN sẽ bị xoá cùng tiến độ."}`
          : x.role === "leader" ? `Bỏ quyền nhóm trưởng của ${x.name}?` : `Cử ${x.name} làm nhóm trưởng? Bạn ấy sẽ có mọi quyền quản lý nhóm.`;
        box.innerHTML = `<p class="prompt">${esc(text)}</p><div class="inline">
          <button class="btn ${remove ? "red" : "green"} sm" type="button" data-yes>Đồng ý</button><button class="btn ghost sm" type="button" data-cancel>Huỷ</button></div>
          <p class="form-error" data-e hidden></p>`;
        box.querySelector("[data-yes]").addEventListener("click", (ev) => busy(ev.currentTarget, box.querySelector("[data-e]"), async () => {
          if (remove) await removeMember(x.id);
          else await setMemberRole(x.id, x.role === "leader" ? "member" : "leader");
          await load();
        }));
      }
      box.querySelector("[data-cancel]")?.addEventListener("click", () => { box.hidden = true; box.innerHTML = ""; });
    });
  }

  /* ---------- câu gốc tuần ---------- */
  function weekly(panel, leader) {
    const w = data.weekly;
    panel.innerHTML = `
      ${w ? `<div class="weekly-card"><p class="eyebrow">Câu gốc tuần này${w.setBy ? ` · ${esc(w.setBy)} chọn` : ""}</p>
          <h3 class="ref-title">${esc(w.ref)}</h3><blockquote class="hand">${esc(w.text)}</blockquote>
          <div class="actions" style="justify-content:flex-start">
            <button class="btn red sm" type="button" data-play="order">Xếp câu này</button>
            <button class="btn teal sm" type="button" data-play="recall">Thuộc lòng</button>
            ${leader ? `<button class="btn ghost sm" type="button" data-clear>Bỏ câu gốc tuần</button>` : ""}
          </div></div>`
        : `<p class="prompt">${leader ? "Nhóm chưa có câu gốc tuần này. Chọn một câu để cả nhóm cùng học." : "Nhóm trưởng chưa chọn câu gốc tuần này."}</p>`}
      ${leader ? `
        <p class="section-title">Chọn từ bộ câu gốc của Manna</p>
        <div class="inline">
          <label class="sr" for="wk-curated">Câu gốc</label>
          <select id="wk-curated" class="field">${TOPICS.map((t) => `<optgroup label="${esc(t.name)}">${VERSES.filter((v) => v.topic === t.id)
            .map((v) => `<option value="${v.id}">${esc(v.ref)}</option>`).join("")}</optgroup>`).join("")}</select>
          <button class="btn green sm" type="button" data-set-curated>Đặt câu này</button>
        </div>
        <p class="section-title">Hoặc chọn bất kỳ câu nào trong Kinh Thánh</p>
        <div class="bible-pick" data-bible><p class="prompt">Đang tải danh sách sách…</p></div>
        <p class="form-error" role="alert" data-werr hidden></p>
        <p class="form-hint">Văn bản được trích tự động từ Kinh Thánh 1934, không cần gõ tay. Tối đa 5 câu liền nhau. Câu gốc tuần thay “câu gốc hôm nay” cho cả nhóm đến hết Chủ Nhật.</p>` : ""}`;

    panel.querySelectorAll("[data-play]").forEach((b) => b.addEventListener("click", () => { m.close(); go(`play/${b.dataset.play}`, { verse: w.id }); }));
    panel.querySelector("[data-clear]")?.addEventListener("click", (e) => busy(e.currentTarget, null, async () => { await clearWeeklyVerse(); await load(); }));
    if (!leader) return;
    const err = panel.querySelector("[data-werr]");
    panel.querySelector("[data-set-curated]").addEventListener("click", (e) => busy(e.currentTarget, err, async () => {
      await setWeeklyVerse({ verseId: panel.querySelector("#wk-curated").value });
      toast("Đã đặt câu gốc tuần", { tone: "good", icon: ICON.check });
      await load();
    }));
    biblePicker(panel.querySelector("[data-bible]"), err);
  }

  async function biblePicker(box, err) {
    try { booksCache ??= (await bibleBooks()).books; } catch (e) { box.innerHTML = `<p class="form-error">${esc(e.message)}</p>`; return; }
    const sel = { book: 43, chapter: 3, from: 16, to: 16 };
    const opts = (n, cur, start = 1) => Array.from({ length: n - start + 1 }, (_, i) => i + start).map((x) => `<option value="${x}" ${x === cur ? "selected" : ""}>${x}</option>`).join("");
    function draw() {
      const b = booksCache[sel.book - 1];
      const count = b.chapters[sel.chapter - 1];
      sel.from = Math.min(sel.from, count);
      sel.to = Math.min(Math.max(sel.to, sel.from), Math.min(count, sel.from + 4));
      box.innerHTML = `<div class="pick-row">
          <label>Sách<select class="field" data-k="book">${booksCache.map((x) => `<option value="${x.n}" ${x.n === sel.book ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>
          <label>Chương<select class="field" data-k="chapter">${opts(b.chapters.length, sel.chapter)}</select></label>
          <label>Từ câu<select class="field" data-k="from">${opts(count, sel.from)}</select></label>
          <label>Đến câu<select class="field" data-k="to">${opts(Math.min(count, sel.from + 4), sel.to, sel.from)}</select></label>
        </div>
        <div class="preview" data-preview><p class="prompt">Đang tải đoạn này…</p></div>
        <button class="btn gold sm" type="button" data-set-bible disabled>Đặt làm câu gốc tuần</button>`;
      box.querySelectorAll("[data-k]").forEach((s) => s.addEventListener("change", () => {
        sel[s.dataset.k] = Number(s.value);
        if (s.dataset.k === "book") { sel.chapter = 1; sel.from = 1; sel.to = 1; }
        if (s.dataset.k === "chapter") { sel.from = 1; sel.to = 1; }
        if (s.dataset.k === "from") sel.to = sel.from;
        draw();
      }));
      const btn = box.querySelector("[data-set-bible]");
      btn.addEventListener("click", () => busy(btn, err, async () => {
        await setWeeklyVerse({ book: sel.book, chapter: sel.chapter, from: sel.from, to: sel.to });
        toast("Đã đặt câu gốc tuần", { tone: "good", icon: ICON.check });
        await load();
      }));
      const want = { ...sel };
      passage(sel.book, sel.chapter, sel.from, sel.to).then((p) => {
        if (want.book !== sel.book || want.chapter !== sel.chapter || want.from !== sel.from || want.to !== sel.to) return;
        box.querySelector("[data-preview]").innerHTML = `<p class="eyebrow">${esc(p.ref)}</p><p class="hand">${esc(p.text)}</p>`;
        btn.disabled = false;
      }).catch((e) => { box.querySelector("[data-preview]").innerHTML = `<p class="form-error">${esc(e.message)}</p>`; });
    }
    draw();
  }

  /* ---------- quản lý / tuỳ chọn ---------- */
  function settings(panel, leader) {
    const canLeave = account.me?.user.hasGoogle;
    panel.innerHTML = `
      ${leader ? `
        <form class="form" data-rename novalidate>
          <label for="gr-name">Tên nhóm</label>
          <div class="inline"><input id="gr-name" class="field" maxlength="40" value="${esc(data.group.name)}"><button class="btn green sm" type="submit">Lưu tên</button></div>
          <p class="form-error" data-e1 hidden></p>
        </form>
        <div class="setting"><span><b>Đổi mã mời</b><small>Mã cũ sẽ hết hiệu lực. Ai đã vào nhóm vẫn ở trong nhóm.</small></span>
          <button class="btn ghost sm" type="button" data-code>Tạo mã mới</button></div>` : ""}
      <div class="setting"><span><b>Rời nhóm</b><small>${canLeave ? "Tiến độ vẫn giữ trong tài khoản Google của bạn." : "Tài khoản dùng PIN gắn với nhóm này. Liên kết Google trong Hồ sơ để có thể đổi nhóm."}</small></span>
        <button class="btn ghost sm" type="button" data-leave ${canLeave ? "" : "disabled"}>Rời nhóm</button></div>
      <p class="form-error" data-e2 hidden></p>`;
    const e2 = panel.querySelector("[data-e2]");
    panel.querySelector("[data-rename]")?.addEventListener("submit", (e) => {
      e.preventDefault();
      busy(e.submitter, panel.querySelector("[data-e1]"), async () => { await renameGroup(panel.querySelector("#gr-name").value); await load(); toast("Đã đổi tên nhóm"); });
    });
    panel.querySelector("[data-code]")?.addEventListener("click", (e) => busy(e.currentTarget, e2, async () => { await newGroupCode(); await load(); toast("Đã tạo mã mời mới"); }));
    panel.querySelector("[data-leave]").addEventListener("click", (e) => busy(e.currentTarget, e2, async () => { await leaveGroup(); m.close(); toast("Bạn đã rời nhóm"); }));
  }

  if (!isLeader() && tab === "settings") tab = "members";
  load();
}
