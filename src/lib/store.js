// Lưu trạng thái người chơi trong localStorage, có số phiên bản và chuyển đổi từ bản cũ.

export const STORAGE_KEY = "manna.v2";
const LEGACY_KEY = "manna.v1";

export function defaultState() {
  return {
    v: 2,
    profile: { name: "Bạn trẻ", avatar: "boy" },
    settings: { sound: true, dailyGoal: 50, lenient: false, bigText: false },
    xp: 0,
    streak: 0,
    bestStreak: 0,
    lastActive: "",
    today: { date: "", xp: 0 },
    verses: {},
    badges: {},
    stats: { rounds: 0, perfectRounds: 0, votdDone: "", votdCount: 0 },
    last: { topic: "all", level: 2 },
  };
}

const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);

function merge(base, extra) {
  const out = { ...base };
  for (const k of Object.keys(extra || {})) {
    out[k] = isObj(base[k]) && isObj(extra[k]) && k !== "verses" && k !== "badges" ? merge(base[k], extra[k]) : extra[k];
  }
  return out;
}

export function migrate(raw) {
  if (!isObj(raw)) return defaultState();
  if (raw.v === 2) return merge(defaultState(), raw);
  if (raw.v === undefined && "xp" in raw) {
    // Bản thử nghiệm đầu tiên (manna.v1): chỉ giữ tên, XP, chuỗi, âm thanh.
    const s = defaultState();
    if (typeof raw.name === "string" && raw.name.trim()) s.profile.name = raw.name.trim().slice(0, 20);
    s.xp = Math.max(0, raw.xp | 0);
    s.streak = Math.max(0, raw.streak | 0);
    s.bestStreak = s.streak;
    s.lastActive = typeof raw.last === "string" ? raw.last : "";
    s.settings.sound = raw.sound !== false;
    return s;
  }
  return defaultState();
}

export function createStore(storage) {
  const read = (key) => {
    try { const s = storage?.getItem(key); return s ? JSON.parse(s) : null; } catch { return null; }
  };
  let state = migrate(read(STORAGE_KEY) ?? read(LEGACY_KEY));
  const listeners = new Set();

  const save = () => {
    try { storage?.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* bộ nhớ đầy hoặc bị chặn */ }
    listeners.forEach((fn) => fn(state));
  };

  return {
    get: () => state,
    update(fn) { fn(state); save(); return state; },
    reset() { state = defaultState(); save(); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}
