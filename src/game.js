// Lớp nối giữa luật chơi (lib/) và giao diện: lưu trữ, cộng XP, kết thúc lượt, huy hiệu, hàng đợi đồng bộ.
import { createStore } from "./lib/store.js";
import { VERSES, TOPICS } from "./data/verses.js";
import { allVerses, findVerse, setExtraVerses, GROUP_TOPIC } from "./data/catalog.js";
import { dayStr, isoWeek, applyXp, reviewVerse, earnedBadges, verseOfDay, levelInfo, BADGES } from "./lib/progress.js";
import { makeEvent } from "./lib/sync.js";
import { CONFIG } from "./config.js";
import { play } from "./lib/sound.js";
import { toast } from "./ui/feedback.js";
import { ICON, BADGE_ICON } from "./ui/icons.js";

function safeStorage() {
  try {
    localStorage.setItem("__manna", "1");
    localStorage.removeItem("__manna");
    return localStorage;
  } catch {
    return null;
  }
}

export const newId = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`).replace(/[^\w-]/g, "");

export const store = createStore(safeStorage());
if (!store.get().sync.deviceId) store.update((s) => { s.sync.deviceId = newId(); });
setExtraVerses(store.get().extraVerses);
store.subscribe((s) => setExtraVerses(s.extraVerses));

export const today = () => dayStr();
export const verseById = (id) => findVerse(id);
export const topicName = (id) =>
  id === "all" ? "Tất cả" : id === GROUP_TOPIC.id ? GROUP_TOPIC.name : TOPICS.find((t) => t.id === id)?.name ?? id;
export const badgeById = (id) => BADGES.find((b) => b.id === id);

// Câu gốc tuần của nhóm (nếu có, trong tuần này) thay cho câu gốc hôm nay.
export function weeklyVerse() {
  const w = store.get().weekly;
  return w && w.week === isoWeek(today()) ? findVerse(w.id) ?? null : null;
}
export const todaysVerse = () => weeklyVerse() ?? verseOfDay(VERSES, today());

function collectBadges(s, day) {
  const ids = earnedBadges(s, VERSES, TOPICS).filter((id) => !s.badges[id]);
  for (const id of ids) s.badges[id] = day;
  return ids;
}

// Báo lên cấp / đạt mục tiêu / huy hiệu bằng thông báo nối tiếp nhau.
function announce(ev) {
  const s = store.get();
  const queue = [];
  if (ev.leveledUp) queue.push(() => { play("level"); toast(`Lên cấp ${levelInfo(s.xp).level}!`, { tone: "gold", icon: ICON.star }); });
  if (ev.goalReached) queue.push(() => toast(`Đạt mục tiêu hôm nay: ${s.settings.dailyGoal} XP`, { tone: "good", icon: ICON.goal }));
  for (const id of ev.badges ?? []) {
    const b = badgeById(id);
    queue.push(() => toast(`Huy hiệu mới: ${b.name}`, { tone: "gold", icon: BADGE_ICON[b.icon] }));
  }
  queue.forEach((fn, i) => setTimeout(fn, i * 2600));
}

// Thẻ ôn tập: ghi nhận ngay từng thẻ.
export function recordFlashcard(verseId, known) {
  const day = today();
  let ev;
  store.update((s) => {
    s.verses[verseId] = reviewVerse(s.verses[verseId], known, day);
    ev = known ? applyXp(s, CONFIG.xp.flashKnown, day) : { leveledUp: false, goalReached: false };
    if (known) s.sync.pending.push(makeEvent({ id: newId(), day, at: Date.now(), xp: CONFIG.xp.flashKnown, kind: "flash", mode: "review" }));
    ev.badges = collectBadges(s, day);
    s.sync.dirty = true;
  });
  announce(ev);
}

// Kết thúc một lượt. results: [{ id, success, xp }]
export function finishRound(results, mode) {
  const day = today();
  const votd = todaysVerse();
  const roundXp = results.reduce((a, r) => a + r.xp, 0);
  let summary;
  store.update((s) => {
    const levelBefore = levelInfo(s.xp);
    for (const r of results) s.verses[r.id] = reviewVerse(s.verses[r.id], r.success, day);
    const votdHit = s.stats.votdDone !== day && results.some((r) => r.id === votd.id && r.success);
    if (votdHit) { s.stats.votdDone = day; s.stats.votdCount++; }
    const bonus = votdHit ? CONFIG.xp.votdBonus : 0;
    const successes = results.filter((r) => r.success).length;
    const perfect = results.length > 0 && successes === results.length;
    s.stats.rounds++;
    if (perfect) s.stats.perfectRounds++;
    const ev = applyXp(s, roundXp + bonus, day);
    s.sync.pending.push(makeEvent({ id: newId(), day, at: Date.now(), xp: roundXp + bonus, kind: "round", mode, perfect, votd: votdHit }));
    s.sync.dirty = true;
    summary = {
      roundXp, bonus, total: roundXp + bonus, successes, count: results.length, votdHit,
      levelBefore, levelAfter: levelInfo(s.xp), ...ev, badges: collectBadges(s, day),
    };
  });
  return summary;
}

export { allVerses };
