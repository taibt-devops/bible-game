// Đăng nhập / vào nhóm / tạo nhóm.
import { account, loginPin, joinPin, loginGoogle, joinGroup, createGroup, logout, initAccount } from "../net/account.js";
import { renderGoogleButton, googleEnabled } from "../net/google.js";
import { store } from "../game.js";
import { esc } from "../ui/dom.js";
import { ICON } from "../ui/icons.js";
import { openModal, toast, busy } from "../ui/feedback.js";
import { openGroup } from "./group.js";

export function openAccount() {
  if (!account.online) return offlineModal();
  if (!account.me) return guestModal();
  if (!account.me.group) return noGroupModal();
  return openGroup();
}

function offlineModal() {
  const m = openModal({
    title: "Chưa kết nối được",
    body: `<p class="prompt">Chưa kết nối được máy chủ Manna. Bạn vẫn chơi bình thường, tiến độ được lưu trên máy và sẽ gửi lên khi đăng nhập.</p>
      <div class="actions"><button class="btn ghost sm" type="button" data-close>Để sau</button><button class="btn green sm" type="button" data-retry>${ICON.refresh} Thử lại</button></div>`,
  });
  m.el.querySelector("[data-retry]").addEventListener("click", async (e) => {
    await busy(e.currentTarget, null, initAccount);
    m.close();
    if (account.online) openAccount();
    else toast("Vẫn chưa kết nối được máy chủ.");
  });
}

function welcome() {
  toast(`Chào ${account.me.user.name}!`, { tone: "good", icon: ICON.check });
}

function guestModal() {
  let mode = "login";
  const m = openModal({
    title: "Vào nhóm thanh niên",
    body: `
      <div class="seg" role="group" aria-label="Chọn cách vào">
        <button type="button" data-mode="login" aria-pressed="true">Đã có tài khoản</button>
        <button type="button" data-mode="join" aria-pressed="false">Lần đầu vào nhóm</button>
      </div>
      <form class="form" data-pin novalidate>
        <label for="f-code">Mã nhóm</label>
        <input id="f-code" class="field code-field" maxlength="8" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="VD: K7M2QX" data-autofocus>
        <label for="f-name">Tên của bạn</label>
        <input id="f-name" class="field" maxlength="20" autocomplete="nickname" placeholder="Tên trong nhóm" value="${account.me ? "" : esc(store.get().profile.name === "Bạn trẻ" ? "" : store.get().profile.name)}">
        <label for="f-pin">PIN (4–6 chữ số)</label>
        <input id="f-pin" class="field" type="password" inputmode="numeric" maxlength="6" autocomplete="current-password" placeholder="••••">
        <p class="form-hint" data-hint>Mã nhóm do nhóm trưởng gửi. Tên và PIN là của bạn đã đặt lúc vào nhóm.</p>
        <p class="form-error" role="alert" data-error hidden></p>
        <button class="btn green" type="submit" data-submit>Đăng nhập ${ICON.chev}</button>
      </form>
      ${googleEnabled() ? `<div class="or"><span>hoặc</span></div>
        <div class="gbtn" data-google></div>
        <p class="form-hint center">Dành cho nhóm trưởng và bạn có tài khoản Google. Muốn <b>tạo nhóm mới</b>, hãy đăng nhập Google.</p>` : ""}
      <p class="meta center">Tiến độ đang có trên máy này sẽ được đưa vào tài khoản của bạn.</p>`,
  });
  const form = m.el.querySelector("[data-pin]");
  const err = m.el.querySelector("[data-error]");
  const hint = m.el.querySelector("[data-hint]");
  const submit = m.el.querySelector("[data-submit]");
  const pin = m.el.querySelector("#f-pin");

  m.el.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => {
    mode = b.dataset.mode;
    m.el.querySelectorAll("[data-mode]").forEach((x) => x.setAttribute("aria-pressed", x === b));
    submit.innerHTML = mode === "join" ? `Vào nhóm ${ICON.chev}` : `Đăng nhập ${ICON.chev}`;
    pin.autocomplete = mode === "join" ? "new-password" : "current-password";
    hint.textContent = mode === "join"
      ? "Chọn một tên và PIN để đăng nhập lần sau. Hãy nhớ PIN; nếu quên, nhóm trưởng sẽ đặt lại giúp."
      : "Mã nhóm do nhóm trưởng gửi. Tên và PIN là của bạn đã đặt lúc vào nhóm.";
    err.hidden = true;
  }));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const code = m.el.querySelector("#f-code").value.trim();
    const name = m.el.querySelector("#f-name").value.trim();
    const p = pin.value.trim();
    if (!code || !name || !/^\d{4,6}$/.test(p)) {
      err.textContent = "Hãy điền đủ mã nhóm, tên và PIN 4–6 chữ số.";
      err.hidden = false;
      return;
    }
    busy(submit, err, async () => {
      await (mode === "join" ? joinPin(code, name, p, store.get().profile.avatar) : loginPin(code, name, p));
      m.close();
      welcome();
    });
  });

  const g = m.el.querySelector("[data-google]");
  if (g) renderGoogleButton(g, (credential) => busy(submit, err, async () => {
    await loginGoogle(credential);
    m.close();
    welcome();
    if (!account.me.group) noGroupModal();
  }));
}

function noGroupModal() {
  const m = openModal({
    title: "Chọn nhóm của bạn",
    body: `
      <form class="form" data-join novalidate>
        <label for="g-code">Vào nhóm có sẵn</label>
        <div class="inline">
          <input id="g-code" class="field code-field" maxlength="8" autocomplete="off" autocapitalize="characters" placeholder="Mã nhóm" data-autofocus>
          <button class="btn green sm" type="submit">Vào nhóm</button>
        </div>
        <p class="form-error" role="alert" data-err1 hidden></p>
      </form>
      <div class="or"><span>hoặc</span></div>
      <form class="form" data-create novalidate>
        <label for="g-name">Tạo nhóm mới</label>
        <div class="inline">
          <input id="g-name" class="field" maxlength="40" placeholder="VD: Thanh niên Hội Thánh Ân Điển">
          <button class="btn gold sm" type="submit">Tạo nhóm</button>
        </div>
        <p class="form-hint">Bạn sẽ là nhóm trưởng và nhận mã mời để gửi cho các bạn.</p>
        <p class="form-error" role="alert" data-err2 hidden></p>
      </form>
      <div class="actions"><button class="btn ghost sm" type="button" data-logout>Đăng xuất</button></div>`,
  });
  m.el.querySelector("[data-join]").addEventListener("submit", (e) => {
    e.preventDefault();
    busy(e.submitter ?? e.target.querySelector("button"), m.el.querySelector("[data-err1]"), async () => {
      await joinGroup(m.el.querySelector("#g-code").value);
      m.close();
      toast(`Đã vào nhóm ${account.me.group.name}`, { tone: "good", icon: ICON.check });
    });
  });
  m.el.querySelector("[data-create]").addEventListener("submit", (e) => {
    e.preventDefault();
    busy(e.submitter ?? e.target.querySelector("button"), m.el.querySelector("[data-err2]"), async () => {
      await createGroup(m.el.querySelector("#g-name").value);
      m.close();
      openGroup({ justCreated: true });
    });
  });
  m.el.querySelector("[data-logout]").addEventListener("click", (e) => busy(e.currentTarget, null, async () => {
    await logout();
    m.close();
    toast("Đã đăng xuất");
  }));
}
