// Xác minh Google ID token (Sign in with Google) bằng node:crypto, không cần thư viện ngoài.
import crypto from "node:crypto";

const CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);

const decode = (part) => JSON.parse(Buffer.from(part, "base64url").toString("utf8"));

export function createGoogleVerifier({ clientId, fetchImpl = globalThis.fetch, now = () => Date.now() }) {
  let cache = { keys: [], expires: 0 };

  async function loadKeys(force = false) {
    if (!force && cache.keys.length && now() < cache.expires) return cache.keys;
    const res = await fetchImpl(CERTS_URL);
    if (!res.ok) throw new Error(`google certs ${res.status}`);
    const body = await res.json();
    const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get("cache-control") || "")?.[1] ?? 3600);
    cache = { keys: body.keys || [], expires: now() + maxAge * 1000 };
    return cache.keys;
  }

  // Trả về { sub, email, name } hoặc ném lỗi.
  return async function verify(token) {
    if (!clientId) throw new Error("Chưa cấu hình GOOGLE_CLIENT_ID");
    if (typeof token !== "string" || token.split(".").length !== 3) throw new Error("token sai định dạng");
    const [h, p, s] = token.split(".");
    const header = decode(h);
    if (header.alg !== "RS256" || !header.kid) throw new Error("thuật toán không hỗ trợ");
    let jwk = (await loadKeys()).find((k) => k.kid === header.kid);
    if (!jwk) jwk = (await loadKeys(true)).find((k) => k.kid === header.kid);
    if (!jwk) throw new Error("không tìm thấy khoá");
    const ok = crypto.verify("RSA-SHA256", Buffer.from(`${h}.${p}`), crypto.createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(s, "base64url"));
    if (!ok) throw new Error("chữ ký không hợp lệ");
    const claims = decode(p);
    const t = Math.floor(now() / 1000);
    if (!ISSUERS.has(claims.iss)) throw new Error("iss không hợp lệ");
    if (claims.aud !== clientId) throw new Error("aud không khớp");
    if (!(claims.exp > t - 30)) throw new Error("token hết hạn");
    if (claims.iat && claims.iat > t + 300) throw new Error("iat ở tương lai");
    if (!claims.sub) throw new Error("thiếu sub");
    return { sub: String(claims.sub), email: claims.email_verified === false ? "" : claims.email || "", name: claims.given_name || claims.name || "" };
  };
}
