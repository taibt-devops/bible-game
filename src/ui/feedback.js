// Thông báo nhanh, hộp thoại, chữ XP bay lên, pháo giấy.
import { esc, reducedMotion } from "./dom.js";
import { ICON } from "./icons.js";

let toastTimer;
export function toast(message, { tone = "", icon = "", ms = 2400 } = {}) {
  const el = document.getElementById("toast");
  el.className = `toast ${tone}`;
  el.innerHTML = `${icon}<span>${esc(message)}</span>`;
  requestAnimationFrame(() => el.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), ms);
}

// Mở hộp thoại. body là HTML đã escape. Trả về { el, close }.
export function openModal({ title = "", body = "", className = "", label = title, onClose } = {}) {
  const prev = document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.innerHTML = `<div class="sheet ${className}" role="dialog" aria-modal="true" aria-label="${esc(label)}">
    ${title ? `<div class="sheet-head"><h2>${esc(title)}</h2><button class="x" type="button" data-close aria-label="Đóng">${ICON.close}</button></div>` : ""}
    ${body}</div>`;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    overlay.remove();
    removeEventListener("keydown", onKeyDown, true);
    onClose?.();
    prev?.focus?.();
  };
  const onKeyDown = (e) => {
    if (e.key === "Escape") { e.preventDefault(); close(); }
    if (e.key === "Tab") {
      const f = [...overlay.querySelectorAll("button,input,textarea,a[href],[tabindex]")].filter((x) => !x.disabled);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.closest("[data-close]")) close();
  });
  addEventListener("keydown", onKeyDown, true);
  document.body.appendChild(overlay);
  const focusTarget = overlay.querySelector("[data-autofocus]") || overlay.querySelector(".sheet button:not(.x), .sheet input") || overlay.querySelector("button");
  focusTarget?.focus();
  return { el: overlay.firstElementChild, close };
}

export function confirmModal({ title, text, ok = "Đồng ý", cancel = "Huỷ", danger = false }) {
  return new Promise((resolve) => {
    let answer = false;
    const m = openModal({
      title,
      body: `<p style="margin:0;font-weight:700;line-height:1.5">${esc(text)}</p>
        <div class="actions"><button class="btn ghost sm" type="button" data-close>${esc(cancel)}</button>
        <button class="btn sm ${danger ? "red" : "green"}" type="button" data-ok data-autofocus>${esc(ok)}</button></div>`,
      onClose: () => resolve(answer),
    });
    m.el.querySelector("[data-ok]").addEventListener("click", () => { answer = true; m.close(); });
  });
}

export function floatXp(anchor, text) {
  const r = anchor.getBoundingClientRect();
  const el = document.createElement("span");
  el.className = "float-xp";
  el.textContent = text;
  el.style.left = `${r.left + r.width / 2 - 20}px`;
  el.style.top = `${r.top - 6}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

export function burst(anchor, count = 18) {
  if (reducedMotion()) return;
  const r = anchor.getBoundingClientRect();
  const colors = ["#e3a425", "#3f8a3a", "#c2412d", "#4f87a6", "#6f5aa0"];
  for (let i = 0; i < count; i++) {
    const s = document.createElement("i");
    s.className = "spark";
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const d = 50 + Math.random() * 70;
    s.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;background:${colors[i % colors.length]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 30}px`;
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 950);
  }
}

// Gắn trạng thái chờ + báo lỗi cho một nút.
export async function busy(button, errorEl, task) {
  const label = button.innerHTML;
  button.disabled = true;
  button.textContent = "Đang xử lý…";
  if (errorEl) errorEl.hidden = true;
  try {
    return await task();
  } catch (e) {
    if (errorEl) { errorEl.textContent = e.message; errorEl.hidden = false; }
    else toast(e.message);
    return undefined;
  } finally {
    button.disabled = false;
    button.innerHTML = label;
  }
}
