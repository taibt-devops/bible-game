// PIN, phiên đăng nhập, kiểm tra tên, giới hạn tần suất.
import crypto from "node:crypto";

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 };

export function hashPin(pin) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pin, salt, SCRYPT.keylen, SCRYPT);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export function verifyPin(pin, stored) {
  if (!stored?.startsWith("scrypt$")) return false;
  const [, salt, hash] = stored.split("$");
  const expected = Buffer.from(hash, "base64url");
  const got = crypto.scryptSync(pin, Buffer.from(salt, "base64url"), expected.length, SCRYPT);
  return crypto.timingSafeEqual(expected, got);
}

export const validPin = (pin) => typeof pin === "string" && /^\d{4,6}$/.test(pin);

export const newToken = () => crypto.randomBytes(32).toString("base64url");
export const tokenHash = (token) => crypto.createHash("sha256").update(token).digest("hex");

// Tên hiển thị: 2–20 ký tự, chữ/số/khoảng trắng và . _ -
export function cleanName(raw) {
  if (typeof raw !== "string") return null;
  const name = raw.normalize("NFC").replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > 20) return null;
  if (!/^[\p{L}\p{M}\p{N} ._-]+$/u.test(name)) return null;
  return name;
}

export const nameKey = (name) => name.normalize("NFC").toLowerCase();

export function cleanGroupName(raw) {
  if (typeof raw !== "string") return null;
  const name = raw.normalize("NFC").replace(/\s+/g, " ").trim();
  return name.length >= 2 && name.length <= 40 ? name : null;
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function newGroupCode() {
  const bytes = crypto.randomBytes(6);
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}
export const cleanCode = (raw) => (typeof raw === "string" ? raw.toUpperCase().replace(/[^A-Z0-9]/g, "") : "");

export const AVATARS = ["boy", "girl", "lamb", "dove"];

// Giới hạn tần suất theo cửa sổ trượt, giữ trong bộ nhớ (một máy chủ là đủ cho quy mô nhóm thanh niên).
export function createRateLimiter({ limit, windowMs, now = () => Date.now() }) {
  const hits = new Map();
  return {
    take(key) {
      const t = now();
      const list = (hits.get(key) || []).filter((x) => t - x < windowMs);
      if (list.length >= limit) {
        hits.set(key, list);
        return Math.ceil((windowMs - (t - list[0])) / 1000);
      }
      list.push(t);
      hits.set(key, list);
      if (hits.size > 10000) for (const [k, v] of hits) if (!v.length || t - v[v.length - 1] > windowMs) hits.delete(k);
      return 0;
    },
  };
}
