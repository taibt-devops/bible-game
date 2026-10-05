// Nút "Đăng nhập bằng Google" (Google Identity Services), chỉ tải khi cần.
import { account } from "./account.js";

let loading = null;

function loadGis() {
  if (window.google?.accounts?.id) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = resolve;
    s.onerror = () => { loading = null; reject(new Error("Không tải được Google")); };
    document.head.appendChild(s);
  });
  return loading;
}

export const googleEnabled = () => !!account.googleClientId;

// Vẽ nút Google vào el; onCredential nhận ID token. Trả về false nếu không dùng được.
export async function renderGoogleButton(el, onCredential) {
  if (!googleEnabled()) return false;
  try {
    await loadGis();
  } catch {
    el.innerHTML = `<p class="form-hint">Không tải được nút Google. Kiểm tra mạng rồi mở lại.</p>`;
    return false;
  }
  window.google.accounts.id.initialize({
    client_id: account.googleClientId,
    callback: (r) => onCredential(r.credential),
    ux_mode: "popup",
    auto_select: false,
  });
  window.google.accounts.id.renderButton(el, {
    theme: "outline", size: "large", shape: "pill", text: "signin_with", locale: "vi",
    width: Math.min(320, Math.max(220, el.clientWidth || 300)),
  });
  return true;
}
