// Gọi API Manna (cùng tên miền, nhánh /api). Lỗi luôn có thông điệp tiếng Việt.
import { CONFIG } from "../config.js";

export class ApiError extends Error {
  constructor(status, message, code = "") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function api(path, { method = "GET", body, timeout = 12000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const write = method !== "GET";
    const res = await fetch(`${CONFIG.apiBase}${path}`, {
      method,
      credentials: "same-origin",
      headers: write ? { "content-type": "application/json" } : {},
      body: write ? JSON.stringify(body ?? {}) : undefined,
      signal: ctrl.signal,
    });
    let data = null;
    try { data = await res.json(); } catch { /* không phải JSON: không có máy chủ API */ }
    if (!data) throw new ApiError(0, "Không kết nối được máy chủ. Bạn vẫn chơi được, tiến độ lưu trên máy.", "network");
    if (!res.ok) throw new ApiError(res.status, data.error || "Máy chủ gặp lỗi. Hãy thử lại sau.", data.code);
    return data;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(0, "Không kết nối được máy chủ. Bạn vẫn chơi được, tiến độ lưu trên máy.", "network");
  } finally {
    clearTimeout(timer);
  }
}
