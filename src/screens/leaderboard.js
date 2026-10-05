// Bảng xếp hạng của nhóm (tuần này / mọi lúc).
import { account, leaderboard } from "../net/account.js";
import { esc, fmt } from "../ui/dom.js";
import { ICON, AVATARS } from "../ui/icons.js";
import { openModal } from "../ui/feedback.js";
import { openAccount } from "./account.js";

const MEDALS = [ICON.medal("#e3a425", "#c2412d"), ICON.medal("#b9c2cc", "#4f87a6"), ICON.medal("#c98a52", "#3f8a3a")];

export function openLeaderboard() {
  if (!account.me?.group) {
    const m = openModal({
      title: "Bảng xếp hạng",
      body: `<p class="prompt">Bảng xếp hạng tính theo nhóm thanh niên. ${account.me ? "Hãy vào một nhóm bằng mã mời" : "Hãy đăng nhập và vào nhóm"} để thi đua cùng các bạn mỗi tuần.</p>
        <div class="actions"><button class="btn green sm" type="button" data-go>${account.me ? "Vào nhóm" : "Đăng nhập / Vào nhóm"}</button></div>`,
    });
    m.el.querySelector("[data-go]").addEventListener("click", () => { m.close(); openAccount(); });
    return;
  }
  let period = "week";
  const m = openModal({
    title: "Bảng xếp hạng",
    body: `<div class="tabs small" role="tablist">
        <button class="tab" role="tab" type="button" data-p="week" aria-selected="true">Tuần này</button>
        <button class="tab" role="tab" type="button" data-p="all" aria-selected="false">Mọi lúc</button>
      </div><div data-list><p class="prompt">Đang tải…</p></div>
      <p class="form-hint center">Tuần tính từ thứ Hai đến Chủ Nhật. Mỗi lượt chơi và thẻ ôn đều được cộng điểm.</p>`,
  });
  const list = m.el.querySelector("[data-list]");
  async function load() {
    list.innerHTML = `<p class="prompt">Đang tải…</p>`;
    try {
      const lb = await leaderboard(period);
      list.innerHTML = `<ol class="lb">${lb.rows.map((r) => `
        <li class="${r.me ? "me" : ""}">
          <span class="rank">${r.rank <= 3 && r.xp > 0 ? MEDALS[r.rank - 1] : r.rank}</span>
          <span class="avatar sm">${AVATARS[r.avatar] ?? AVATARS.boy}</span>
          <b class="nm">${esc(r.name)}${r.me ? " (bạn)" : ""}</b>
          <span class="pts">${fmt(r.xp)} XP</span>
        </li>`).join("")}</ol>`;
    } catch (e) {
      list.innerHTML = `<p class="form-error">${esc(e.message)}</p>`;
    }
  }
  m.el.querySelectorAll("[data-p]").forEach((b) => b.addEventListener("click", () => {
    period = b.dataset.p;
    m.el.querySelectorAll("[data-p]").forEach((x) => x.setAttribute("aria-selected", x === b));
    load();
  }));
  load();
}
