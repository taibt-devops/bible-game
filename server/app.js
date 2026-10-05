// Các API của Manna. createApp trả về hàm xử lý yêu cầu (dễ kiểm thử, không phụ thuộc cổng mạng).
import { createRouter, readJson, sendJson, parseCookies, cookie, clientIp, fail, HttpError } from "./http.js";
import { tx } from "./db.js";
import {
  hashPin, verifyPin, validPin, newToken, tokenHash, cleanName, nameKey, cleanGroupName, newGroupCode, cleanCode, AVATARS, createRateLimiter,
} from "./auth.js";
import { serveStatic } from "./static.js";
import { dayStr, isoWeek, dayDiff, bestStreakFrom, BADGES, MAX_BOX } from "../src/lib/progress.js";
import { validateEvent, LIMITS } from "../src/lib/sync.js";

const SESSION_COOKIE = "manna_sid";
const LOCK_AFTER = 5;
const LOCK_MS = 15 * 60 * 1000;
const BADGE_IDS = new Set(BADGES.map((b) => b.id));
const isDay = (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
const int = (x, min, max) => Number.isInteger(x) && x >= min && x <= max;

export function createApp({ db, config, bible, verifyGoogle, now = () => Date.now(), today = () => dayStr() }) {
  const r = createRouter();
  const authLimiter = createRateLimiter({ limit: 20, windowMs: 60_000, now });
  const apiLimiter = createRateLimiter({ limit: 600, windowMs: 60_000, now });
  const q = (sql) => db.prepare(sql);

  /* ---------- tiện ích ---------- */

  function setSession(res, userId) {
    const token = newToken();
    const t = now();
    q("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").run(tokenHash(token), userId, t, t + config.sessionDays * 864e5);
    q("DELETE FROM sessions WHERE expires_at < ?").run(t);
    res.setHeader("set-cookie", cookie(SESSION_COOKIE, token, { maxAge: config.sessionDays * 86400, secure: config.cookieSecure }));
  }

  function clearSession(req, res) {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (token) q("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash(token));
    res.setHeader("set-cookie", cookie(SESSION_COOKIE, "", { maxAge: 0, secure: config.cookieSecure }));
  }

  function currentUser(req) {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (!token) return null;
    const row = q(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`).get(tokenHash(token), now());
    if (row && now() - row.last_seen > 60_000) q("UPDATE users SET last_seen = ? WHERE id = ?").run(now(), row.id);
    return row || null;
  }

  const needUser = (ctx) => ctx.user || fail(401, "Bạn cần đăng nhập.", "auth");
  function needGroup(ctx) {
    const u = needUser(ctx);
    if (!u.group_id) fail(409, "Bạn chưa vào nhóm nào.", "no_group");
    return u;
  }
  function needLeader(ctx) {
    const u = needGroup(ctx);
    if (u.role !== "leader") fail(403, "Chỉ nhóm trưởng mới làm được việc này.", "not_leader");
    return u;
  }

  const groupById = (id) => q("SELECT * FROM groups WHERE id = ?").get(id);
  const leaderCount = (groupId) => q("SELECT COUNT(*) AS n FROM users WHERE group_id = ? AND role = 'leader'").get(groupId).n;
  const memberCount = (groupId) => q("SELECT COUNT(*) AS n FROM users WHERE group_id = ?").get(groupId).n;

  // Người duy nhất làm nhóm trưởng thì không được rời nhóm khi nhóm còn người khác.
  function assertCanLeave(u) {
    if (u.group_id && u.role === "leader" && leaderCount(u.group_id) === 1 && memberCount(u.group_id) > 1) {
      fail(409, "Bạn là nhóm trưởng duy nhất. Hãy cử thêm nhóm trưởng trước khi rời nhóm.", "last_leader");
    }
  }
  function dropEmptyGroup(groupId) {
    if (groupId && memberCount(groupId) === 0) q("DELETE FROM groups WHERE id = ?").run(groupId);
  }

  function weeklyVerse(groupId) {
    if (!groupId) return null;
    const week = isoWeek(today());
    const row = q(`SELECT w.*, u.name AS set_by_name FROM weekly_verses w LEFT JOIN users u ON u.id = w.set_by WHERE w.group_id = ? AND w.week = ?`).get(groupId, week);
    if (!row) return null;
    return { id: row.verse_id, ref: row.ref, text: row.text, words: row.text.split(/\s+/).length, week, setBy: row.set_by_name || "" };
  }

  function meView(u) {
    const g = u.group_id ? groupById(u.group_id) : null;
    return {
      user: { id: u.id, name: u.name, avatar: u.avatar, role: u.role, hasPin: !!u.pin_hash, hasGoogle: !!u.google_sub, email: u.email || "" },
      group: g ? { id: g.id, name: g.name, code: g.code, members: memberCount(g.id) } : null,
      weekly: weeklyVerse(u.group_id),
    };
  }

  function uniqueCode() {
    for (let i = 0; i < 20; i++) {
      const code = newGroupCode();
      if (!q("SELECT 1 FROM groups WHERE code = ?").get(code)) return code;
    }
    throw new Error("không tạo được mã nhóm");
  }

  function nameTaken(groupId, name, exceptId = 0) {
    return !!q("SELECT 1 FROM users WHERE group_id = ? AND name_key = ? AND id != ?").get(groupId, nameKey(name), exceptId);
  }

  async function googleIdentity(credential) {
    if (!config.googleClientId) fail(501, "Máy chủ chưa bật đăng nhập Google.", "google_off");
    try {
      return await verifyGoogle(credential);
    } catch {
      fail(401, "Không xác minh được tài khoản Google. Hãy thử lại.", "google_invalid");
    }
  }

  /* ---------- hệ thống ---------- */

  r.get("/api/health", () => ({ ok: true, time: new Date(now()).toISOString() }));
  r.get("/api/config", () => ({ googleClientId: config.googleClientId || "", today: today(), week: isoWeek(today()) }));

  /* ---------- đăng nhập bằng mã nhóm + PIN ---------- */

  r.post("/api/auth/pin/join", async (ctx) => {
    const { code, name: rawName, pin, avatar } = ctx.body;
    const group = q("SELECT * FROM groups WHERE code = ?").get(cleanCode(code));
    if (!group) fail(404, "Không tìm thấy nhóm với mã này. Hãy hỏi lại nhóm trưởng.", "bad_code");
    const name = cleanName(rawName) || fail(400, "Tên cần 2–20 ký tự, chỉ gồm chữ, số và khoảng trắng.", "bad_name");
    if (!validPin(pin)) fail(400, "PIN gồm 4 đến 6 chữ số.", "bad_pin");
    if (nameTaken(group.id, name)) fail(409, "Tên này đã có trong nhóm. Nếu là bạn, hãy chọn Đăng nhập.", "name_taken");
    const t = now();
    const id = q(`INSERT INTO users (group_id, name, name_key, avatar, role, pin_hash, created_at, last_seen) VALUES (?, ?, ?, ?, 'member', ?, ?, ?)`)
      .run(group.id, name, nameKey(name), AVATARS.includes(avatar) ? avatar : "boy", hashPin(pin), t, t).lastInsertRowid;
    setSession(ctx.res, id);
    return { status: 201, body: meView(q("SELECT * FROM users WHERE id = ?").get(id)) };
  });

  r.post("/api/auth/pin/login", async (ctx) => {
    const { code, name: rawName, pin } = ctx.body;
    const group = q("SELECT * FROM groups WHERE code = ?").get(cleanCode(code));
    const name = cleanName(rawName);
    const u = group && name ? q("SELECT * FROM users WHERE group_id = ? AND name_key = ?").get(group.id, nameKey(name)) : null;
    if (!u || !u.pin_hash || !validPin(pin)) fail(401, "Sai mã nhóm, tên hoặc PIN.", "bad_login");
    if (u.locked_until > now()) {
      fail(429, `Tạm khoá do nhập sai nhiều lần. Thử lại sau ${Math.ceil((u.locked_until - now()) / 60000)} phút, hoặc nhờ nhóm trưởng đặt lại PIN.`, "locked");
    }
    if (!verifyPin(pin, u.pin_hash)) {
      const failed = u.failed_pins + 1;
      if (failed >= LOCK_AFTER) q("UPDATE users SET failed_pins = 0, locked_until = ? WHERE id = ?").run(now() + LOCK_MS, u.id);
      else q("UPDATE users SET failed_pins = ? WHERE id = ?").run(failed, u.id);
      fail(401, "Sai mã nhóm, tên hoặc PIN.", "bad_login");
    }
    q("UPDATE users SET failed_pins = 0, locked_until = 0, last_seen = ? WHERE id = ?").run(now(), u.id);
    setSession(ctx.res, u.id);
    return meView(u);
  });

  /* ---------- đăng nhập Google ---------- */

  r.post("/api/auth/google", async (ctx) => {
    const g = await googleIdentity(ctx.body.credential);
    let u = q("SELECT * FROM users WHERE google_sub = ?").get(g.sub);
    if (!u) {
      const name = cleanName(g.name) || cleanName((g.email || "").split("@")[0]) || "Bạn mới";
      const t = now();
      const id = q(`INSERT INTO users (group_id, name, name_key, role, google_sub, email, created_at, last_seen) VALUES (NULL, ?, ?, 'member', ?, ?, ?, ?)`)
        .run(name, nameKey(name), g.sub, g.email, t, t).lastInsertRowid;
      u = q("SELECT * FROM users WHERE id = ?").get(id);
    } else if (g.email && g.email !== u.email) {
      q("UPDATE users SET email = ? WHERE id = ?").run(g.email, u.id);
    }
    setSession(ctx.res, u.id);
    return meView(q("SELECT * FROM users WHERE id = ?").get(u.id));
  });

  r.post("/api/auth/logout", (ctx) => {
    clearSession(ctx.req, ctx.res);
    return { ok: true };
  });

  /* ---------- tài khoản ---------- */

  r.get("/api/me", (ctx) => meView(needUser(ctx)));

  r.patch("/api/me", (ctx) => {
    const u = needUser(ctx);
    const { name: rawName, avatar } = ctx.body;
    if (rawName !== undefined) {
      const name = cleanName(rawName) || fail(400, "Tên cần 2–20 ký tự, chỉ gồm chữ, số và khoảng trắng.", "bad_name");
      if (u.group_id && nameTaken(u.group_id, name, u.id)) fail(409, "Tên này đã có người dùng trong nhóm.", "name_taken");
      q("UPDATE users SET name = ?, name_key = ? WHERE id = ?").run(name, nameKey(name), u.id);
    }
    if (avatar !== undefined) {
      if (!AVATARS.includes(avatar)) fail(400, "Ảnh đại diện không hợp lệ.");
      q("UPDATE users SET avatar = ? WHERE id = ?").run(avatar, u.id);
    }
    return meView(q("SELECT * FROM users WHERE id = ?").get(u.id));
  });

  r.delete("/api/me", (ctx) => {
    const u = needUser(ctx);
    assertCanLeave(u);
    tx(db, () => {
      q("DELETE FROM users WHERE id = ?").run(u.id);
      dropEmptyGroup(u.group_id);
    });
    clearSession(ctx.req, ctx.res);
    return { ok: true };
  });

  r.post("/api/me/google", async (ctx) => {
    const u = needUser(ctx);
    const g = await googleIdentity(ctx.body.credential);
    const other = q("SELECT id FROM users WHERE google_sub = ?").get(g.sub);
    if (other && other.id !== u.id) fail(409, "Tài khoản Google này đã gắn với người dùng khác.", "google_taken");
    q("UPDATE users SET google_sub = ?, email = ? WHERE id = ?").run(g.sub, g.email, u.id);
    return meView(q("SELECT * FROM users WHERE id = ?").get(u.id));
  });

  /* ---------- nhóm ---------- */

  r.post("/api/groups", (ctx) => {
    const u = needUser(ctx);
    if (!u.google_sub) fail(403, "Chỉ tài khoản Google mới tạo được nhóm.", "google_required");
    const name = cleanGroupName(ctx.body.name) || fail(400, "Tên nhóm cần 2–40 ký tự.", "bad_group_name");
    assertCanLeave(u);
    tx(db, () => {
      const id = q("INSERT INTO groups (code, name, created_at) VALUES (?, ?, ?)").run(uniqueCode(), name, now()).lastInsertRowid;
      q("UPDATE users SET group_id = ?, role = 'leader' WHERE id = ?").run(id, u.id);
      dropEmptyGroup(u.group_id);
    });
    return { status: 201, body: meView(q("SELECT * FROM users WHERE id = ?").get(u.id)) };
  });

  r.post("/api/groups/join", (ctx) => {
    const u = needUser(ctx);
    if (!u.google_sub) fail(403, "Tài khoản dùng PIN gắn với một nhóm. Hãy liên kết Google trước khi đổi nhóm.", "google_required");
    const group = q("SELECT * FROM groups WHERE code = ?").get(cleanCode(ctx.body.code));
    if (!group) fail(404, "Không tìm thấy nhóm với mã này. Hãy hỏi lại nhóm trưởng.", "bad_code");
    if (group.id === u.group_id) return meView(u);
    if (nameTaken(group.id, u.name, u.id)) fail(409, `Trong nhóm đã có người tên “${u.name}”. Hãy đổi tên trong hồ sơ rồi thử lại.`, "name_taken");
    assertCanLeave(u);
    tx(db, () => {
      q("UPDATE users SET group_id = ?, role = 'member' WHERE id = ?").run(group.id, u.id);
      dropEmptyGroup(u.group_id);
    });
    return meView(q("SELECT * FROM users WHERE id = ?").get(u.id));
  });

  r.post("/api/group/leave", (ctx) => {
    const u = needGroup(ctx);
    if (!u.google_sub) fail(403, "Tài khoản dùng PIN không thể rời nhóm. Hãy liên kết Google trước.", "google_required");
    assertCanLeave(u);
    tx(db, () => {
      q("UPDATE users SET group_id = NULL, role = 'member' WHERE id = ?").run(u.id);
      dropEmptyGroup(u.group_id);
    });
    return meView(q("SELECT * FROM users WHERE id = ?").get(u.id));
  });

  r.get("/api/group", (ctx) => {
    const u = needGroup(ctx);
    const g = groupById(u.group_id);
    const week = isoWeek(today());
    const members = q(`SELECT u.id, u.name, u.avatar, u.role, u.last_seen, u.pin_hash IS NOT NULL AS has_pin, u.google_sub IS NOT NULL AS has_google,
        COALESCE((SELECT SUM(xp) FROM events e WHERE e.user_id = u.id AND e.week = ? AND e.kind != 'import'), 0) AS week_xp,
        (SELECT MAX(day) FROM user_days d WHERE d.user_id = u.id) AS last_day
      FROM users u WHERE u.group_id = ? ORDER BY u.role = 'leader' DESC, u.name_key`).all(week, u.group_id);
    return {
      group: { id: g.id, name: g.name, code: g.code, members: members.length },
      me: { id: u.id, role: u.role },
      weekly: weeklyVerse(u.group_id),
      members: members.map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, role: m.role, weekXp: m.week_xp, lastDay: m.last_day || "", hasPin: !!m.has_pin, hasGoogle: !!m.has_google })),
    };
  });

  r.patch("/api/group", (ctx) => {
    const u = needLeader(ctx);
    const name = cleanGroupName(ctx.body.name) || fail(400, "Tên nhóm cần 2–40 ký tự.", "bad_group_name");
    q("UPDATE groups SET name = ? WHERE id = ?").run(name, u.group_id);
    return meView(u);
  });

  r.post("/api/group/code", (ctx) => {
    const u = needLeader(ctx);
    q("UPDATE groups SET code = ? WHERE id = ?").run(uniqueCode(), u.group_id);
    return meView(u);
  });

  r.put("/api/group/weekly-verse", (ctx) => {
    const u = needLeader(ctx);
    const { verseId, book, chapter, from, to } = ctx.body;
    const v = verseId ? bible.byId(String(verseId)) : bible.passage(Number(book), Number(chapter), Number(from), Number(to ?? from));
    if (!v) fail(400, "Không tìm thấy đoạn Kinh Thánh này (tối đa 5 câu liền nhau).", "bad_passage");
    q(`INSERT INTO weekly_verses (group_id, week, verse_id, ref, text, set_by, set_at) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (group_id, week) DO UPDATE SET verse_id = excluded.verse_id, ref = excluded.ref, text = excluded.text, set_by = excluded.set_by, set_at = excluded.set_at`)
      .run(u.group_id, isoWeek(today()), v.id, v.ref, v.text, u.id, now());
    return { weekly: weeklyVerse(u.group_id) };
  });

  r.delete("/api/group/weekly-verse", (ctx) => {
    const u = needLeader(ctx);
    q("DELETE FROM weekly_verses WHERE group_id = ? AND week = ?").run(u.group_id, isoWeek(today()));
    return { weekly: null };
  });

  function memberOf(leader, id) {
    const m = q("SELECT * FROM users WHERE id = ? AND group_id = ?").get(Number(id), leader.group_id);
    return m || fail(404, "Không tìm thấy thành viên này trong nhóm.", "no_member");
  }

  r.post("/api/group/members/:id/pin", (ctx) => {
    const u = needLeader(ctx);
    const m = memberOf(u, ctx.params.id);
    if (!m.pin_hash) fail(400, "Bạn này đăng nhập bằng Google, không dùng PIN.", "no_pin");
    if (!validPin(ctx.body.pin)) fail(400, "PIN gồm 4 đến 6 chữ số.", "bad_pin");
    q("UPDATE users SET pin_hash = ?, failed_pins = 0, locked_until = 0 WHERE id = ?").run(hashPin(ctx.body.pin), m.id);
    q("DELETE FROM sessions WHERE user_id = ?").run(m.id);
    return { ok: true };
  });

  r.delete("/api/group/members/:id", (ctx) => {
    const u = needLeader(ctx);
    const m = memberOf(u, ctx.params.id);
    if (m.id === u.id) fail(400, "Muốn rời nhóm, hãy dùng nút Rời nhóm.");
    if (m.role === "leader" && leaderCount(u.group_id) === 1) fail(409, "Không thể mời nhóm trưởng duy nhất ra khỏi nhóm.", "last_leader");
    // Tài khoản chỉ dùng PIN gắn liền với nhóm, nên bị xoá luôn; tài khoản Google chỉ rời nhóm.
    if (m.google_sub) q("UPDATE users SET group_id = NULL, role = 'member' WHERE id = ?").run(m.id);
    else q("DELETE FROM users WHERE id = ?").run(m.id);
    return { ok: true };
  });

  r.post("/api/group/members/:id/role", (ctx) => {
    const u = needLeader(ctx);
    const m = memberOf(u, ctx.params.id);
    const role = ctx.body.role;
    if (!["leader", "member"].includes(role)) fail(400, "Vai trò không hợp lệ.");
    if (role === "member" && m.role === "leader" && leaderCount(u.group_id) === 1) fail(409, "Nhóm cần ít nhất một nhóm trưởng.", "last_leader");
    q("UPDATE users SET role = ? WHERE id = ?").run(role, m.id);
    return { ok: true };
  });

  /* ---------- Kinh Thánh ---------- */

  r.get("/api/bible/books", () => ({ books: bible.books }));
  r.get("/api/bible/passage", (ctx) => {
    const s = ctx.url.searchParams;
    const v = bible.passage(Number(s.get("book")), Number(s.get("chapter")), Number(s.get("from")), Number(s.get("to") || s.get("from")));
    return v || fail(404, "Không tìm thấy đoạn Kinh Thánh này (tối đa 5 câu liền nhau).", "bad_passage");
  });

  /* ---------- đồng bộ ---------- */

  function stateView(userId, clientDay) {
    const sums = q(`SELECT COALESCE(SUM(xp),0) AS xp, COALESCE(SUM(rounds),0) AS rounds, COALESCE(SUM(perfect),0) AS perfect,
        COALESCE(SUM(votd),0) AS votd, MAX(CASE WHEN votd = 1 THEN day END) AS votd_day FROM events WHERE user_id = ?`).get(userId);
    const dayXp = q("SELECT COALESCE(SUM(xp),0) AS xp FROM events WHERE user_id = ? AND day = ?").get(userId, clientDay).xp;
    const verses = {};
    for (const v of q("SELECT * FROM user_verses WHERE user_id = ?").all(userId)) {
      verses[v.verse_id] = { box: v.box, due: v.due, seen: v.seen, correct: v.correct, lastUp: v.last_up, at: v.at };
    }
    const badges = {};
    for (const b of q("SELECT badge_id, day FROM user_badges WHERE user_id = ?").all(userId)) badges[b.badge_id] = b.day;
    const days = q("SELECT day FROM user_days WHERE user_id = ? ORDER BY day DESC LIMIT 400").all(userId).map((d) => d.day).reverse();
    return {
      xp: sums.xp, dayXp,
      stats: { rounds: sums.rounds, perfectRounds: sums.perfect, votdCount: sums.votd, votdDone: sums.votd_day || "" },
      verses, badges, days, bestStreak: bestStreakFrom(days),
    };
  }

  r.post("/api/sync", (ctx) => {
    const u = needUser(ctx);
    const serverDay = today();
    const { events = [], verses = {}, badges = {}, days = [] } = ctx.body;
    const clientDay = isDay(ctx.body.today) && Math.abs(dayDiff(serverDay, ctx.body.today)) <= 1 ? ctx.body.today : serverDay;
    if (!Array.isArray(events) || events.length > LIMITS.eventsPerSync) fail(400, "Quá nhiều sự kiện trong một lần đồng bộ.");
    const accepted = [], rejected = [];

    tx(db, () => {
      const dayTotals = new Map();
      const dayTotal = (d) => {
        if (!dayTotals.has(d)) dayTotals.set(d, q("SELECT COALESCE(SUM(xp),0) AS xp FROM events WHERE user_id = ? AND day = ? AND kind != 'import'").get(u.id, d).xp);
        return dayTotals.get(d);
      };
      let hasImport = !!q("SELECT 1 FROM events WHERE user_id = ? AND kind = 'import'").get(u.id);
      const insert = q(`INSERT OR IGNORE INTO events (user_id, id, day, week, at, xp, kind, mode, rounds, perfect, votd) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      const addDay = q("INSERT OR IGNORE INTO user_days (user_id, day) VALUES (?, ?)");
      for (const e of events) {
        const why = validateEvent(e, serverDay);
        if (why) { rejected.push({ id: e?.id, reason: why }); continue; }
        if (e.kind === "import") {
          if (hasImport) { rejected.push({ id: e.id, reason: "đã nhập XP cũ" }); continue; }
          hasImport = true;
        } else if (dayTotal(e.day) + e.xp > LIMITS.dayXp) {
          rejected.push({ id: e.id, reason: "vượt giới hạn XP trong ngày" });
          continue;
        }
        const res = insert.run(u.id, e.id, e.day, isoWeek(e.day), int(e.at, 0, 1e14) ? e.at : now(), e.xp, e.kind, String(e.mode || "").slice(0, 12), e.rounds ?? 0, e.perfect ?? 0, e.votd ?? 0);
        if (res.changes && e.kind !== "import") dayTotals.set(e.day, dayTotal(e.day) + e.xp);
        if (e.xp > 0 && e.kind !== "import") addDay.run(u.id, e.day);
        accepted.push(e.id);
      }

      const upsertVerse = q(`INSERT INTO user_verses (user_id, verse_id, box, due, seen, correct, last_up, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (user_id, verse_id) DO UPDATE SET box = excluded.box, due = excluded.due, seen = excluded.seen, correct = excluded.correct,
          last_up = excluded.last_up, at = excluded.at WHERE excluded.at > user_verses.at`);
      for (const [id, v] of Object.entries(verses).slice(0, 3000)) {
        if (!v || !bible.isVerseId(id)) continue;
        if (!int(v.box, 0, MAX_BOX) || !int(v.seen, 0, 1e6) || !int(v.correct, 0, 1e6) || !int(v.at, 0, 1e14)) continue;
        if (!(v.due === "" || isDay(v.due)) || !(v.lastUp === "" || isDay(v.lastUp))) continue;
        upsertVerse.run(u.id, id, v.box, v.due, v.seen, v.correct, v.lastUp, v.at);
      }

      const upsertBadge = q(`INSERT INTO user_badges (user_id, badge_id, day) VALUES (?, ?, ?)
        ON CONFLICT (user_id, badge_id) DO UPDATE SET day = excluded.day WHERE excluded.day < user_badges.day`);
      for (const [id, d] of Object.entries(badges)) if (BADGE_IDS.has(id) && isDay(d)) upsertBadge.run(u.id, id, d);

      if (Array.isArray(days)) {
        for (const d of days.slice(-400)) if (isDay(d) && dayDiff(d, serverDay) >= -1 && dayDiff(d, serverDay) <= 400) addDay.run(u.id, d);
      }
    });

    return { ...stateView(u.id, clientDay), ack: [...accepted, ...rejected.map((x) => x.id).filter(Boolean)], rejected };
  });

  /* ---------- bảng xếp hạng ---------- */

  r.get("/api/leaderboard", (ctx) => {
    const u = needGroup(ctx);
    const period = ctx.url.searchParams.get("period") === "all" ? "all" : "week";
    const limit = Math.min(50, Math.max(1, Number(ctx.url.searchParams.get("limit")) || 20));
    const week = isoWeek(today());
    const rows = period === "week"
      ? q(`SELECT u.id, u.name, u.avatar, COALESCE(SUM(e.xp),0) AS xp FROM users u
           LEFT JOIN events e ON e.user_id = u.id AND e.week = ? AND e.kind != 'import'
           WHERE u.group_id = ? GROUP BY u.id ORDER BY xp DESC, u.name_key`).all(week, u.group_id)
      : q(`SELECT u.id, u.name, u.avatar, COALESCE(SUM(e.xp),0) AS xp FROM users u
           LEFT JOIN events e ON e.user_id = u.id WHERE u.group_id = ? GROUP BY u.id ORDER BY xp DESC, u.name_key`).all(u.group_id);
    let rank = 0, prev = null;
    const ranked = rows.map((row, i) => {
      if (row.xp !== prev) { rank = i + 1; prev = row.xp; }
      return { rank, id: row.id, name: row.name, avatar: row.avatar, xp: row.xp, me: row.id === u.id };
    });
    const top = ranked.slice(0, limit);
    const mine = ranked.find((x) => x.me);
    if (mine && !top.includes(mine)) top.push(mine);
    return { period, week, members: rows.length, rows: top };
  });

  /* ---------- xử lý yêu cầu ---------- */

  const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

  function checkOrigin(req) {
    const origin = req.headers.origin;
    if (!origin) return;
    const host = req.headers.host;
    const allowed = new Set([config.publicOrigin, `https://${host}`, `http://${host}`].filter(Boolean));
    if (!allowed.has(origin)) fail(403, "Nguồn yêu cầu không được phép.", "bad_origin");
  }

  return async function handle(req, res) {
    const url = new URL(req.url, "http://localhost");
    try {
      if (!url.pathname.startsWith("/api/")) {
        if (config.serveStatic && (req.method === "GET" || req.method === "HEAD")) return serveStatic(req, res, url.pathname, config.staticRoot);
        return sendJson(res, 404, { error: "Không tìm thấy." });
      }
      if (config.originSecret && url.pathname !== "/api/health" && req.headers["x-origin-verify"] !== config.originSecret) {
        fail(403, "Yêu cầu phải đi qua CloudFront.", "bad_origin");
      }
      const ip = clientIp(req, config.proxyHops);
      const wait = apiLimiter.take(ip);
      if (wait) fail(429, `Bạn thao tác quá nhanh. Thử lại sau ${wait} giây.`, "rate");
      const { handler, pathMatched, params } = r.match(req.method, url.pathname);
      if (!handler) fail(pathMatched ? 405 : 404, "Không tìm thấy.");
      const ctx = { req, res, url, params, user: null, body: {} };
      if (MUTATING.has(req.method)) {
        checkOrigin(req);
        ctx.body = await readJson(req);
      }
      if (url.pathname.startsWith("/api/auth/") && req.method === "POST") {
        const w = authLimiter.take(ip);
        if (w) fail(429, `Thử đăng nhập quá nhiều lần. Đợi ${w} giây rồi thử lại.`, "rate");
      }
      ctx.user = currentUser(req);
      const out = await handler(ctx);
      if (out && out.status && out.body) return sendJson(res, out.status, out.body);
      return sendJson(res, 200, out ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError) return sendJson(res, e.status, { error: e.message, code: e.code });
      if (String(e?.message).includes("UNIQUE constraint failed: users.group_id, users.name_key")) {
        return sendJson(res, 409, { error: "Tên này đã có trong nhóm.", code: "name_taken" });
      }
      console.error(new Date().toISOString(), req.method, url.pathname, e);
      return sendJson(res, 500, { error: "Máy chủ gặp lỗi. Hãy thử lại sau." });
    }
  };
}
