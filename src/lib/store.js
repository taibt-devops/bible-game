// Lưu trạng thái người chơi trong localStorage, có số phiên bản và chuyển đổi từ bản cũ.

import { addDays, dayStr } from "./progress.js";

export const STORAGE_KEY = "manna.v3";
const OLD_KEYS = ["manna.v2", "manna.v1"];

export function defaultState() {
  return {
    v: 3,
    profile: { name: "Bạn trẻ", avatar: "boy" },
    settings: { sound: true, dailyGoal: 50, lenient: false, bigText: false },
    xp: 0,
    bestStreak: 0,
    today: { date: "", xp: 0 },
    days: [],
    verses: {},
    badges: {},
    stats: { rounds: 0, perfectRounds: 0, votdDone: "", votdCount: 0 },
    extraVerses: {},
    last: { topic: "all", level: 2 },
    sync: { deviceId: "", pending: [], lastSync: "" },
  };
}

const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);

function merge(base, extra) {
  const out = { ...base };
  for (const k of Object.keys(extra || {})) {
    out[k] = isObj(base[k]) && isObj(extra[k]) && !["verses", "badges", "extraVerses"].includes(k) ? merge(base[k], extra[k]) : extra[k];
  }
  return out;
}

const isDay = (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);

// v2 → v3: dựng lại các ngày học từ chuỗi ngày, gói XP cũ vào một sự kiện "nhập" để đưa lên máy chủ.
function fromV2(raw) {
  const { streak = 0, lastActive = "", ...rest } = raw;
  const s = merge(defaultState(), { ...rest, v: 3 });
  s.days = [];
  if (isDay(lastActive)) for (let i = Math.min(streak, 400) - 1; i >= 0; i--) s.days.push(addDays(lastActive, -i));
  s.bestStreak = Math.max(s.bestStreak | 0, s.days.length);
  if (s.xp > 0) {
    s.sync.pending = [{ id: `import-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`, day: isDay(lastActive) ? lastActive : dayStr(), at: Date.now(),
      xp: Math.min(s.xp, 5000), kind: "import", mode: "", rounds: 0, perfect: 0, votd: 0 }];
  }
  return s;
}

export function migrate(raw) {
  if (!isObj(raw)) return defaultState();
  if (raw.v === 3) return merge(defaultState(), raw);
  if (raw.v === 2) return fromV2(raw);
  if (raw.v === undefined && "xp" in raw) {
    // Bản thử nghiệm đầu tiên (manna.v1): chỉ giữ tên, XP, chuỗi, âm thanh.
    const v2 = { v: 2, xp: Math.max(0, raw.xp | 0), streak: Math.max(0, raw.streak | 0), lastActive: isDay(raw.last) ? raw.last : "",
      settings: { sound: raw.sound !== false } };
    if (typeof raw.name === "string" && raw.name.trim()) v2.profile = { name: raw.name.trim().slice(0, 20), avatar: "boy" };
    return fromV2(v2);
  }
  return defaultState();
}

export function createStore(storage) {
  const read = (key) => {
    try { const s = storage?.getItem(key); return s ? JSON.parse(s) : null; } catch { return null; }
  };
  let state = migrate(read(STORAGE_KEY) ?? OLD_KEYS.map(read).find(Boolean));
  const listeners = new Set();

  const save = () => {
    try { storage?.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* bộ nhớ đầy hoặc bị chặn */ }
    listeners.forEach((fn) => fn(state));
  };

  return {
    get: () => state,
    update(fn) { fn(state); save(); return state; },
    // Giữ cài đặt và mã thiết bị khi xoá tiến độ (ví dụ lúc đăng xuất).
    reset() {
      const keep = { settings: state.settings, deviceId: state.sync.deviceId };
      state = defaultState();
      state.settings = keep.settings;
      state.sync.deviceId = keep.deviceId;
      save();
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}
