// Tiện ích DOM nhỏ.

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Gắn sự kiện theo kiểu uỷ quyền: handler(event, matchedElement). Trả về hàm gỡ.
export function on(root, type, selector, handler) {
  const fn = (e) => {
    const el = e.target.closest(selector);
    if (el && root.contains(el)) handler(e, el);
  };
  root.addEventListener(type, fn);
  return () => root.removeEventListener(type, fn);
}

export function onKey(handler) {
  const fn = (e) => {
    if (e.defaultPrevented || e.altKey || e.metaKey) return;
    if (document.querySelector(".overlay")) return;
    handler(e);
  };
  addEventListener("keydown", fn);
  return () => removeEventListener("keydown", fn);
}

export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export const fmt = (n) => n.toLocaleString("vi-VN");
