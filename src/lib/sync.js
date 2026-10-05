// Luật đồng bộ dùng chung cho trình duyệt và máy chủ (module thuần).
import { addDays, dayDiff, isoWeek, MAX_DAYS, bestStreakFrom } from "./progress.js";

export const LIMITS = { eventXp: 250, dayXp: 3000, eventAgeDays: 60, importXp: 5000, eventsPerSync: 500 };
export const EVENT_KINDS = ["round", "flash", "import"];

// Một sự kiện = một lượt chơi hoặc một thẻ ôn. Các số đếm là 0/1 để máy chủ cộng dồn.
export function makeEvent({ id, day, at, xp, kind, mode = "", perfect = false, votd = false }) {
  return { id, day, at, xp, kind, mode, rounds: kind === "round" ? 1 : 0, perfect: perfect ? 1 : 0, votd: votd ? 1 : 0 };
}

export function pendingTotals(pending, day) {
  const t = { xp: 0, rounds: 0, perfect: 0, votd: 0, dayXp: 0 };
  for (const e of pending) {
    t.xp += e.xp; t.rounds += e.rounds; t.perfect += e.perfect; t.votd += e.votd;
    if (e.day === day) t.dayXp += e.xp;
  }
  return t;
}

// Kiểm tra sự kiện phía máy chủ. Trả về lý do từ chối hoặc null.
export function validateEvent(e, serverToday) {
  if (!e || typeof e !== "object") return "sai định dạng";
  if (typeof e.id !== "string" || !/^[\w-]{6,64}$/.test(e.id)) return "id không hợp lệ";
  if (!EVENT_KINDS.includes(e.kind)) return "loại không hợp lệ";
  if (typeof e.day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(e.day)) return "ngày không hợp lệ";
  const age = dayDiff(e.day, serverToday);
  if (age < -1) return "ngày ở tương lai";
  if (e.kind !== "import" && age > LIMITS.eventAgeDays) return "ngày quá cũ";
  const max = e.kind === "import" ? LIMITS.importXp : LIMITS.eventXp;
  if (!Number.isInteger(e.xp) || e.xp < 0 || e.xp > max) return "XP không hợp lệ";
  for (const k of ["rounds", "perfect", "votd"]) if (![0, 1].includes(e[k] ?? 0)) return `${k} không hợp lệ`;
  return null;
}

export const eventWeek = (e) => isoWeek(e.day);

/* ---------- gộp ---------- */

export function newerEntry(a, b) {
  if (!a) return b;
  if (!b) return a;
  if ((a.at ?? 0) !== (b.at ?? 0)) return (a.at ?? 0) > (b.at ?? 0) ? a : b;
  return (a.seen ?? 0) >= (b.seen ?? 0) ? a : b;
}

export function mergeVerses(a = {}, b = {}) {
  const out = { ...a };
  for (const [id, e] of Object.entries(b)) out[id] = newerEntry(out[id], e);
  return out;
}

export function mergeBadges(a = {}, b = {}) {
  const out = { ...a };
  for (const [id, day] of Object.entries(b)) if (!out[id] || day < out[id]) out[id] = day;
  return out;
}

export function mergeDays(a = [], b = []) {
  return [...new Set([...a, ...b])].sort().slice(-MAX_DAYS);
}

// Áp dụng kết quả đồng bộ từ máy chủ vào trạng thái trên máy (sửa trực tiếp state).
// sentIds: các sự kiện đã gửi trong lần đồng bộ này (máy chủ đã nhận hoặc đã có).
export function applySyncResponse(state, resp, sentIds, today) {
  const sent = new Set(sentIds);
  state.sync.pending = state.sync.pending.filter((e) => !sent.has(e.id));
  const p = pendingTotals(state.sync.pending, today);
  state.xp = resp.xp + p.xp;
  state.stats.rounds = resp.stats.rounds + p.rounds;
  state.stats.perfectRounds = resp.stats.perfectRounds + p.perfect;
  state.stats.votdCount = resp.stats.votdCount + p.votd;
  if ((resp.stats.votdDone ?? "") > (state.stats.votdDone ?? "")) state.stats.votdDone = resp.stats.votdDone;
  state.today = { date: today, xp: (resp.dayXp ?? 0) + p.dayXp };
  state.verses = mergeVerses(state.verses, resp.verses);
  state.badges = mergeBadges(state.badges, resp.badges);
  state.days = mergeDays(state.days, resp.days);
  state.bestStreak = Math.max(state.bestStreak, resp.bestStreak ?? 0, bestStreakFrom(state.days));
  state.sync.lastSync = new Date().toISOString();
  return state;
}

export { addDays };
