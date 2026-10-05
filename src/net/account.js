// Tài khoản và đồng bộ: đăng nhập, thông tin nhóm, câu gốc tuần, gửi tiến độ lên máy chủ khi có mạng.
import { api, ApiError } from "./api.js";
import { store, today } from "../game.js";
import { applySyncResponse, LIMITS } from "../lib/sync.js";
import { isBaseVerse } from "../data/catalog.js";

const CACHE_KEY = "manna.account";
const listeners = new Set();

// online: máy chủ trả lời được; me: { user, group, weekly } khi đã đăng nhập; top: top 3 tuần của nhóm.
export const account = { ready: false, online: false, me: null, top: [], googleClientId: "", syncing: false, lastError: "" };

export const isSignedIn = () => !!account.me;
export const hasGroup = () => !!account.me?.group;
export const isLeader = () => account.me?.user.role === "leader" && hasGroup();

export function onAccount(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ me: account.me, top: account.top })); } catch { /* bỏ qua */ }
  listeners.forEach((fn) => fn(account));
}

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); } catch { return null; }
}

// Lưu thông tin tài khoản vào trạng thái chơi: tên, ảnh, câu gốc tuần (để chơi khi mất mạng).
function applyMe(me) {
  account.me = me;
  store.update((s) => {
    s.profile = { name: me.user.name, avatar: me.user.avatar };
    const w = me.weekly;
    s.weekly = w ? { id: w.id, week: w.week, setBy: w.setBy } : null;
    if (w && !isBaseVerse(w.id)) s.extraVerses = { ...s.extraVerses, [w.id]: { id: w.id, ref: w.ref, text: w.text, words: w.words, topic: "group" } };
  });
}

function signedOut() {
  account.me = null;
  account.top = [];
}

export async function initAccount() {
  const cached = readCache();
  if (cached?.me) { account.me = cached.me; account.top = cached.top ?? []; }
  try {
    const cfg = await api("/config");
    account.online = true;
    account.googleClientId = cfg.googleClientId || "";
    try {
      applyMe(await api("/me"));
      await syncNow();
    } catch (e) {
      if (e.status === 401) signedOut();
      else throw e;
    }
  } catch {
    account.online = false;
  }
  account.ready = true;
  emit();
}

async function refreshTop() {
  if (!hasGroup()) { account.top = []; return; }
  try {
    const lb = await api("/leaderboard?period=week&limit=3");
    account.top = lb.rows.filter((r) => r.rank <= 3 && r.xp > 0).slice(0, 3);
  } catch { /* giữ bảng cũ */ }
}

/* ---------- đồng bộ ---------- */

let timer = null;
export function scheduleSync(delay = 1500) {
  if (!account.me) return;
  clearTimeout(timer);
  timer = setTimeout(syncNow, delay);
}

export async function syncNow() {
  if (!account.me || account.syncing) return;
  account.syncing = true;
  const s = store.get();
  const sent = s.sync.pending.slice(0, LIMITS.eventsPerSync);
  try {
    const resp = await api("/sync", { method: "POST", body: { today: today(), events: sent, verses: s.verses, badges: s.badges, days: s.days } });
    store.update((st) => {
      applySyncResponse(st, resp, resp.ack ?? sent.map((e) => e.id), today());
      st.sync.dirty = false;
    });
    account.online = true;
    account.lastError = "";
    await refreshTop();
  } catch (e) {
    if (e.status === 401) signedOut();
    else account.online = e.status !== 0;
    account.lastError = e.message;
  } finally {
    account.syncing = false;
    emit();
  }
  if (store.get().sync.pending.length && account.me && account.online) scheduleSync(500);
}

store.subscribe((s) => {
  if (account.me && (s.sync.dirty || s.sync.pending.length) && !account.syncing) scheduleSync();
});
addEventListener("online", () => { if (account.me) syncNow(); else if (!account.online) initAccount(); });
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && account.me) syncNow();
});

/* ---------- đăng nhập / đăng xuất ---------- */

async function signedIn(me) {
  applyMe(me);
  account.online = true;
  emit();
  await syncNow();
  return me;
}

export const loginPin = (code, name, pin) => api("/auth/pin/login", { method: "POST", body: { code, name, pin } }).then(signedIn);
export const joinPin = (code, name, pin, avatar) => api("/auth/pin/join", { method: "POST", body: { code, name, pin, avatar } }).then(signedIn);
export const loginGoogle = (credential) => api("/auth/google", { method: "POST", body: { credential } }).then(signedIn);

export async function linkGoogle(credential) {
  applyMe(await api("/me/google", { method: "POST", body: { credential } }));
  emit();
}

// Đăng xuất: gửi nốt tiến độ, rồi xoá tiến độ trên máy (giữ cài đặt) để người khác dùng máy không thấy.
export async function logout() {
  if (store.get().sync.pending.length) await syncNow();
  if (store.get().sync.pending.length) {
    throw new ApiError(0, "Còn tiến độ chưa gửi lên máy chủ. Hãy kết nối mạng rồi đăng xuất lại.", "unsynced");
  }
  try { await api("/auth/logout", { method: "POST" }); } catch { /* phiên đã hết hạn */ }
  signedOut();
  store.reset();
  emit();
}

export async function deleteAccount() {
  await api("/me", { method: "DELETE" });
  signedOut();
  store.reset();
  emit();
}

export async function updateMe(patch) {
  applyMe(await api("/me", { method: "PATCH", body: patch }));
  emit();
}

/* ---------- nhóm ---------- */

async function meAction(path, body, method = "POST") {
  applyMe(await api(path, { method, body }));
  await refreshTop();
  emit();
  return account.me;
}

export const createGroup = (name) => meAction("/groups", { name });
export const joinGroup = (code) => meAction("/groups/join", { code });
export const leaveGroup = () => meAction("/group/leave", {});
export const renameGroup = (name) => meAction("/group", { name }, "PATCH");
export const newGroupCode = () => meAction("/group/code", {});
export const groupDetails = () => api("/group");
export const leaderboard = (period) => api(`/leaderboard?period=${period}`);
export const bibleBooks = () => api("/bible/books");
export const passage = (book, chapter, from, to) => api(`/bible/passage?book=${book}&chapter=${chapter}&from=${from}&to=${to}`);
export const resetMemberPin = (id, pin) => api(`/group/members/${id}/pin`, { method: "POST", body: { pin } });
export const removeMember = (id) => api(`/group/members/${id}`, { method: "DELETE" });
export const setMemberRole = (id, role) => api(`/group/members/${id}/role`, { method: "POST", body: { role } });

export async function setWeeklyVerse(body) {
  await api("/group/weekly-verse", { method: "PUT", body });
  applyMe(await api("/me"));
  emit();
}

export async function clearWeeklyVerse() {
  await api("/group/weekly-verse", { method: "DELETE" });
  applyMe(await api("/me"));
  emit();
}
