// Luật tiến độ: ngày, XP, cấp, chuỗi ngày, hộp Leitner, chọn câu cho lượt, câu gốc hôm nay, huy hiệu.
// Module thuần — mọi hàm nhận "today" dạng "YYYY-MM-DD" theo giờ địa phương.
import { mulberry32, shuffle } from "./random.js";

export const BOX_INTERVALS = [0, 1, 2, 4, 7, 14];
export const LEARNED_BOX = 4;
export const MAX_BOX = 5;

/* ---------- ngày ---------- */

const pad = (n) => String(n).padStart(2, "0");

export function dayStr(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toUTC(day) {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(day, n) {
  const t = new Date(toUTC(day) + n * 864e5);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function dayDiff(from, to) {
  return Math.round((toUTC(to) - toUTC(from)) / 864e5);
}

/* ---------- XP, cấp, chuỗi ---------- */

export function levelInfo(xp) {
  let level = 1, rest = xp, need = 100;
  while (rest >= need) {
    rest -= need;
    level++;
    need = 100 + 50 * (level - 1);
  }
  return { level, into: rest, need };
}

export function currentStreak(state, today) {
  if (!state.lastActive) return 0;
  return dayDiff(state.lastActive, today) <= 1 ? state.streak : 0;
}

export function todayXp(state, today) {
  return state.today.date === today ? state.today.xp : 0;
}

// Cộng XP (sửa trực tiếp state). Trả về các sự kiện để giao diện báo.
export function applyXp(state, amount, today) {
  const levelBefore = levelInfo(state.xp).level;
  const dayBefore = todayXp(state, today);
  state.xp += amount;
  state.today = { date: today, xp: dayBefore + amount };
  if (amount > 0 && state.lastActive !== today) {
    state.streak = state.lastActive && dayDiff(state.lastActive, today) === 1 ? state.streak + 1 : 1;
    state.lastActive = today;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
  }
  const goal = state.settings.dailyGoal;
  return {
    leveledUp: levelInfo(state.xp).level > levelBefore,
    goalReached: dayBefore < goal && dayBefore + amount >= goal,
  };
}

/* ---------- Leitner ---------- */

export function newEntry() {
  return { box: 0, due: "", seen: 0, correct: 0, lastUp: "" };
}

export function reviewVerse(entry, success, today) {
  const e = { ...newEntry(), ...entry };
  e.seen++;
  if (success) {
    e.correct++;
    if (e.lastUp !== today) {
      e.box = Math.min(MAX_BOX, e.box + 1);
      e.lastUp = today;
    }
    e.box = Math.max(1, e.box);
    e.due = addDays(today, BOX_INTERVALS[e.box]);
  } else {
    e.box = Math.max(1, e.box - 1);
    e.due = today;
  }
  return e;
}

export function verseStatus(entry) {
  if (!entry || entry.box === 0) return "new";
  return entry.box >= LEARNED_BOX ? "learned" : "learning";
}

export function isDue(entry, today) {
  return !!entry && entry.box > 0 && entry.due <= today;
}

export function learnedCount(verseState) {
  return Object.values(verseState).filter((e) => e.box >= LEARNED_BOX).length;
}

// Chọn câu cho một lượt: đến hạn (hộp thấp trước) → mới → còn lại.
export function pickRound(verses, verseState, { count, topic = "all", level = 2, today, onlyId, rnd = Math.random }) {
  if (onlyId) return verses.filter((v) => v.id === onlyId);
  let pool = topic === "all" ? verses : verses.filter((v) => v.topic === topic);
  if (level <= 1) {
    const short = pool.filter((v) => v.words <= 32);
    if (short.length >= count) pool = short;
  }
  const mixed = shuffle(pool, rnd);
  const due = mixed.filter((v) => isDue(verseState[v.id], today)).sort((a, b) => verseState[a.id].box - verseState[b.id].box);
  const fresh = mixed.filter((v) => verseStatus(verseState[v.id]) === "new");
  const rest = mixed.filter((v) => !due.includes(v) && !fresh.includes(v));
  return [...due, ...fresh, ...rest].slice(0, count);
}

export function reviewQueue(verses, verseState, today, { due = 10, fresh = 5, topic = "all", rnd = Math.random } = {}) {
  const pool = topic === "all" ? verses : verses.filter((v) => v.topic === topic);
  const dueList = shuffle(pool, rnd)
    .filter((v) => isDue(verseState[v.id], today))
    .sort((a, b) => verseState[a.id].box - verseState[b.id].box)
    .slice(0, due);
  if (dueList.length) return { kind: "due", list: dueList };
  const freshList = shuffle(pool.filter((v) => verseStatus(verseState[v.id]) === "new"), rnd).slice(0, fresh);
  return { kind: freshList.length ? "new" : "empty", list: freshList };
}

/* ---------- câu gốc hôm nay ---------- */

// Mỗi chu kỳ đi qua hết danh sách theo một thứ tự xáo trộn cố định, nên không lặp câu trong chu kỳ.
export function verseOfDay(verses, today) {
  const day = Math.floor(toUTC(today) / 864e5);
  const cycle = Math.floor(day / verses.length);
  const order = shuffle(verses, mulberry32(cycle * 7919 + 17));
  return order[day % verses.length];
}

/* ---------- kết quả lượt ---------- */

export function roundStars(successes, total) {
  if (!total) return 0;
  const r = successes / total;
  return r === 1 ? 3 : r >= 0.8 ? 2 : r >= 0.5 ? 1 : 0;
}

/* ---------- huy hiệu ---------- */

export const BADGES = [
  { id: "first-round", name: "Bước đầu tiên", desc: "Hoàn thành lượt chơi đầu tiên", icon: "seed" },
  { id: "perfect", name: "Hoàn hảo", desc: "Một lượt không sai câu nào", icon: "star" },
  { id: "streak-3", name: "Chuỗi 3 ngày", desc: "Học 3 ngày liên tiếp", icon: "flame" },
  { id: "streak-7", name: "Chuỗi 7 ngày", desc: "Học 7 ngày liên tiếp", icon: "flame" },
  { id: "streak-30", name: "Chuỗi 30 ngày", desc: "Học 30 ngày liên tiếp", icon: "flame" },
  { id: "learned-5", name: "Thuộc 5 câu", desc: "5 câu gốc đã thuộc", icon: "scroll" },
  { id: "learned-20", name: "Thuộc 20 câu", desc: "20 câu gốc đã thuộc", icon: "scroll" },
  { id: "learned-50", name: "Thuộc 50 câu", desc: "50 câu gốc đã thuộc", icon: "scroll" },
  { id: "topic-master", name: "Trọn chủ đề", desc: "Thuộc hết các câu của một chủ đề", icon: "crown" },
  { id: "level-5", name: "Cấp 5", desc: "Đạt cấp 5", icon: "level" },
  { id: "level-10", name: "Cấp 10", desc: "Đạt cấp 10", icon: "level" },
  { id: "votd-7", name: "Bạn của Lời", desc: "Hoàn thành câu gốc hôm nay 7 lần", icon: "dove" },
];

export function earnedBadges(state, verses, topics) {
  const learned = learnedCount(state.verses);
  const level = levelInfo(state.xp).level;
  const topicDone = topics.some((t) => {
    const list = verses.filter((v) => v.topic === t.id);
    return list.length && list.every((v) => (state.verses[v.id]?.box ?? 0) >= LEARNED_BOX);
  });
  const rules = {
    "first-round": state.stats.rounds >= 1,
    perfect: state.stats.perfectRounds >= 1,
    "streak-3": state.bestStreak >= 3,
    "streak-7": state.bestStreak >= 7,
    "streak-30": state.bestStreak >= 30,
    "learned-5": learned >= 5,
    "learned-20": learned >= 20,
    "learned-50": learned >= 50,
    "topic-master": topicDone,
    "level-5": level >= 5,
    "level-10": level >= 10,
    "votd-7": state.stats.votdCount >= 7,
  };
  return BADGES.filter((b) => rules[b.id]).map((b) => b.id);
}
