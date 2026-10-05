import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import crypto from "node:crypto";
import { openDb } from "../server/db.js";
import { createApp } from "../server/app.js";
import { loadBible } from "../server/bible.js";
import { createGoogleVerifier } from "../server/google.js";
import { makeEvent } from "../src/lib/sync.js";

const bible = loadBible();
const keys = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...keys.publicKey.export({ format: "jwk" }), kid: "k1", alg: "RS256", use: "sig" };

function googleToken(claims, key = keys.privateKey) {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const h = enc({ alg: "RS256", kid: "k1", typ: "JWT" });
  const t = Math.floor(Date.parse("2026-10-05T03:00:00Z") / 1000);
  const p = enc({ iss: "https://accounts.google.com", aud: "cid", iat: t, exp: t + 3600, email_verified: true, ...claims });
  return `${h}.${p}.${crypto.sign("RSA-SHA256", Buffer.from(`${h}.${p}`), key).toString("base64url")}`;
}

async function boot(overrides = {}) {
  const db = openDb(":memory:");
  const env = { clock: Date.parse("2026-10-05T03:00:00Z"), day: "2026-10-05" };
  const verifyGoogle = createGoogleVerifier({
    clientId: "cid",
    now: () => env.clock,
    fetchImpl: async () => ({ ok: true, json: async () => ({ keys: [jwk] }), headers: new Headers({ "cache-control": "max-age=60" }) }),
  });
  const config = { googleClientId: "cid", cookieSecure: false, serveStatic: false, sessionDays: 90, proxyHops: 0, publicOrigin: "", originSecret: "", ...overrides };
  const server = http.createServer(createApp({ db, config, bible, verifyGoogle, now: () => env.clock, today: () => env.day }));
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  function client(extraHeaders = {}) {
    let jar = "";
    const call = async (method, path, body, headers = {}) => {
      const mutating = method !== "GET";
      const res = await fetch(base + path, {
        method,
        headers: { ...(mutating ? { "content-type": "application/json" } : {}), ...(jar ? { cookie: jar } : {}), ...extraHeaders, ...headers },
        body: mutating ? JSON.stringify(body ?? {}) : undefined,
      });
      const sc = res.headers.get("set-cookie");
      if (sc) jar = sc.split(";")[0];
      return { status: res.status, body: await res.json() };
    };
    return call;
  }
  return { env, db, client, base, close: () => new Promise((r) => server.close(r)) };
}

async function leaderWithGroup(t) {
  const leader = t.client();
  await leader("POST", "/api/auth/google", { credential: googleToken({ sub: "g-leader", email: "leader@example.com", given_name: "Anh Tú" }) });
  const g = await leader("POST", "/api/groups", { name: "Thanh niên Ân Điển" });
  return { leader, code: g.body.group.code, groupId: g.body.group.id };
}

const ev = (id, o = {}) => makeEvent({ id, day: "2026-10-05", at: 1, xp: 50, kind: "round", mode: "fill", ...o });

test("health, config và chặn yêu cầu sai", async () => {
  const t = await boot();
  const c = t.client();
  assert.equal((await c("GET", "/api/health")).body.ok, true);
  assert.equal((await c("GET", "/api/config")).body.googleClientId, "cid");
  assert.equal((await c("GET", "/api/me")).status, 401);
  assert.equal((await c("GET", "/api/khong-co")).status, 404);
  assert.equal((await c("GET", "/api/auth/pin/login")).status, 405);
  const res = await fetch(`${t.base}/api/auth/pin/login`, { method: "POST", headers: { "content-type": "text/plain" }, body: "x" });
  assert.equal(res.status, 415, "chỉ nhận JSON");
  assert.equal((await c("POST", "/api/auth/logout", {}, { origin: "https://evil.example" })).status, 403, "chặn Origin lạ");
  await t.close();
});

test("ORIGIN_SECRET: chỉ nhận yêu cầu đi qua CloudFront", async () => {
  const t = await boot({ originSecret: "s3cret" });
  assert.equal((await t.client()("GET", "/api/config")).status, 403);
  assert.equal((await t.client()("GET", "/api/health")).status, 200);
  assert.equal((await t.client({ "x-origin-verify": "s3cret" })("GET", "/api/config")).status, 200);
  await t.close();
});

test("Google: tạo tài khoản, tạo nhóm thành nhóm trưởng; token sai bị từ chối", async () => {
  const t = await boot();
  const c = t.client();
  const me = await c("POST", "/api/auth/google", { credential: googleToken({ sub: "g1", email: "a@example.com", given_name: "Hân" }) });
  assert.equal(me.status, 200);
  assert.equal(me.body.user.name, "Hân");
  assert.equal(me.body.group, null);
  const g = await c("POST", "/api/groups", { name: "Nhóm Bê-tên" });
  assert.equal(g.status, 201);
  assert.equal(g.body.user.role, "leader");
  assert.match(g.body.group.code, /^[A-Z2-9]{6}$/);

  const other = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
  assert.equal((await t.client()("POST", "/api/auth/google", { credential: googleToken({ sub: "g2" }, other) })).status, 401, "chữ ký giả");
  assert.equal((await t.client()("POST", "/api/auth/google", { credential: googleToken({ sub: "g2", aud: "khac" }) })).status, 401, "sai aud");
  assert.equal((await t.client()("POST", "/api/auth/google", { credential: googleToken({ sub: "g2", exp: 1 }) })).status, 401, "hết hạn");
  await t.close();
});

test("PIN: vào nhóm, trùng tên, đăng nhập, khoá sau 5 lần sai, nhóm trưởng đặt lại PIN", async () => {
  const t = await boot();
  const { leader, code } = await leaderWithGroup(t);
  const a = t.client();
  assert.equal((await a("POST", "/api/auth/pin/join", { code: "SAIMA1", name: "Phúc", pin: "1234" })).status, 404);
  assert.equal((await a("POST", "/api/auth/pin/join", { code, name: "P", pin: "1234" })).status, 400);
  assert.equal((await a("POST", "/api/auth/pin/join", { code, name: "Phúc", pin: "12" })).status, 400);
  const j = await a("POST", "/api/auth/pin/join", { code: code.toLowerCase(), name: "Phúc", pin: "1234", avatar: "lamb" });
  assert.equal(j.status, 201);
  assert.equal(j.body.user.avatar, "lamb");
  assert.equal(j.body.group.code, code);
  assert.equal((await t.client()("POST", "/api/auth/pin/join", { code, name: "phúc", pin: "9999" })).status, 409, "tên không phân biệt hoa thường");

  const b = t.client();
  for (let i = 0; i < 5; i++) assert.equal((await b("POST", "/api/auth/pin/login", { code, name: "Phúc", pin: "0000" })).status, 401);
  const locked = await b("POST", "/api/auth/pin/login", { code, name: "Phúc", pin: "1234" });
  assert.equal(locked.status, 429);
  assert.match(locked.body.error, /Tạm khoá/);

  const members = (await leader("GET", "/api/group")).body.members;
  const phuc = members.find((m) => m.name === "Phúc");
  assert.equal((await a("POST", `/api/group/members/${phuc.id}/pin`, { pin: "5678" })).status, 403, "thành viên không đặt lại PIN được");
  assert.equal((await leader("POST", `/api/group/members/${phuc.id}/pin`, { pin: "5678" })).status, 200);
  assert.equal((await a("GET", "/api/me")).status, 401, "đặt lại PIN thì đăng xuất các phiên cũ");
  const ok = await b("POST", "/api/auth/pin/login", { code, name: "PHÚC", pin: "5678" });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.user.hasPin, true);
  assert.equal((await b("POST", "/api/auth/logout")).status, 200);
  assert.equal((await b("GET", "/api/me")).status, 401);
  await t.close();
});

test("đồng bộ: không cộng trùng, từ chối sự kiện sai, gộp câu theo thời điểm, nhập XP cũ một lần", async () => {
  const t = await boot();
  const { code } = await leaderWithGroup(t);
  const c = t.client();
  await c("POST", "/api/auth/pin/join", { code, name: "Gia Ân", pin: "2468" });
  const body = {
    today: "2026-10-05",
    events: [ev("ev-aaaaaa1"), ev("ev-aaaaaa2", { xp: 30, perfect: true, votd: true }), ev("ev-bad0001", { xp: 9999 }), ev("import-x1", { kind: "import", xp: 400, day: "2025-01-01" })],
    verses: { "john-3-16": { box: 2, due: "2026-10-07", seen: 3, correct: 2, lastUp: "2026-10-05", at: 100 }, "khong-co-1-1": { box: 1, due: "", seen: 1, correct: 0, lastUp: "", at: 1 } },
    badges: { "first-round": "2026-10-05", "khong-co": "2026-10-05" },
    days: ["2026-10-03", "2026-10-04"],
  };
  const s1 = await c("POST", "/api/sync", body);
  assert.equal(s1.status, 200);
  assert.equal(s1.body.xp, 480);
  assert.equal(s1.body.dayXp, 80);
  assert.deepEqual(s1.body.stats, { rounds: 2, perfectRounds: 1, votdCount: 1, votdDone: "2026-10-05" });
  assert.deepEqual(s1.body.ack.sort(), ["ev-aaaaaa1", "ev-aaaaaa2", "ev-bad0001", "import-x1"].sort(), "sự kiện sai cũng được xác nhận để máy bỏ khỏi hàng đợi");
  assert.equal(s1.body.rejected.length, 1);
  assert.deepEqual(Object.keys(s1.body.verses), ["john-3-16"]);
  assert.deepEqual(Object.keys(s1.body.badges), ["first-round"]);
  assert.deepEqual(s1.body.days, ["2026-10-03", "2026-10-04", "2026-10-05"]);
  assert.equal(s1.body.bestStreak, 3);

  const s2 = await c("POST", "/api/sync", { ...body, events: [ev("ev-aaaaaa1"), ev("import-x2", { kind: "import", xp: 100 })],
    verses: { "john-3-16": { box: 1, due: "2026-10-05", seen: 2, correct: 1, lastUp: "", at: 50 } } });
  assert.equal(s2.body.xp, 480, "gửi lại không cộng trùng, nhập XP cũ chỉ một lần");
  assert.equal(s2.body.verses["john-3-16"].box, 2, "bản cũ hơn không ghi đè");
  const s3 = await c("POST", "/api/sync", { events: [], verses: { "john-3-16": { box: 3, due: "2026-10-09", seen: 4, correct: 3, lastUp: "2026-10-05", at: 200 } } });
  assert.equal(s3.body.verses["john-3-16"].box, 3);

  const big = Array.from({ length: 13 }, (_, i) => ev(`ev-cap${String(i).padStart(4, "0")}`, { xp: 250 }));
  const s4 = await c("POST", "/api/sync", { events: big });
  assert.ok(s4.body.rejected.some((r) => /giới hạn/.test(r.reason)), "giới hạn 3.000 XP mỗi ngày");
  assert.ok(s4.body.dayXp <= 3000);
  await t.close();
});

test("bảng xếp hạng tuần: chỉ trong nhóm, không tính XP nhập cũ, đồng hạng", async () => {
  const t = await boot();
  const { leader, code } = await leaderWithGroup(t);
  const a = t.client(), b = t.client();
  await a("POST", "/api/auth/pin/join", { code, name: "An", pin: "1111" });
  await b("POST", "/api/auth/pin/join", { code, name: "Bình", pin: "2222" });
  await a("POST", "/api/sync", { events: [ev("ev-a00001", { xp: 80 }), ev("import-a1", { kind: "import", xp: 1000 })] });
  await b("POST", "/api/sync", { events: [ev("ev-b00001", { xp: 80 }), ev("ev-b00002", { xp: 10, day: "2026-09-28" })] });
  await leader("POST", "/api/sync", { events: [ev("ev-l00001", { xp: 20 })] });

  const outsider = t.client();
  await outsider("POST", "/api/auth/google", { credential: googleToken({ sub: "g-out", given_name: "Người ngoài" }) });
  await outsider("POST", "/api/groups", { name: "Nhóm khác" });
  await outsider("POST", "/api/sync", { events: [ev("ev-o00001", { xp: 200 })] });

  const week = (await a("GET", "/api/leaderboard?period=week")).body;
  assert.equal(week.week, "2026-W41");
  assert.deepEqual(week.rows.map((r) => [r.rank, r.name, r.xp]), [[1, "An", 80], [1, "Bình", 80], [3, "Anh Tú", 20]]);
  assert.equal(week.rows.find((r) => r.me).name, "An");
  const all = (await a("GET", "/api/leaderboard?period=all")).body;
  assert.deepEqual(all.rows.map((r) => [r.name, r.xp]), [["An", 1080], ["Bình", 90], ["Anh Tú", 20]]);
  assert.equal((await t.client()("GET", "/api/leaderboard")).status, 401);
  await t.close();
});

test("câu gốc tuần: nhóm trưởng chọn từ toàn bộ Kinh Thánh, thành viên thấy, hết tuần thì hết", async () => {
  const t = await boot();
  const { leader, code } = await leaderWithGroup(t);
  const m = t.client();
  await m("POST", "/api/auth/pin/join", { code, name: "Minh", pin: "1357" });
  assert.equal((await m("PUT", "/api/group/weekly-verse", { verseId: "john-3-16" })).status, 403);
  assert.equal((await leader("PUT", "/api/group/weekly-verse", { book: 43, chapter: 3, from: 16, to: 22 })).status, 400, "tối đa 5 câu");
  assert.equal((await leader("PUT", "/api/group/weekly-verse", { book: 43, chapter: 99, from: 1 })).status, 400);
  const set = await leader("PUT", "/api/group/weekly-verse", { book: 40, chapter: 5, from: 14, to: 15 });
  assert.equal(set.status, 200);
  assert.equal(set.body.weekly.ref, "Ma-thi-ơ 5:14-15");
  assert.equal(set.body.weekly.id, "matthew-5-14-15");
  assert.match(set.body.weekly.text, /^Các ngươi là sự sáng của thế gian/);
  const seen = (await m("GET", "/api/me")).body.weekly;
  assert.equal(seen.ref, "Ma-thi-ơ 5:14-15");
  assert.equal(seen.setBy, "Anh Tú");
  const curated = await leader("PUT", "/api/group/weekly-verse", { verseId: "psalms-119-9" });
  assert.match(curated.body.weekly.text, /^Người trẻ tuổi/, "câu có trong bộ chung dùng bản đã sửa lỗi");
  await m("POST", "/api/sync", { verses: { "matthew-5-14-15": { box: 1, due: "2026-10-06", seen: 1, correct: 1, lastUp: "2026-10-05", at: 5 } } });
  assert.ok((await m("POST", "/api/sync", {})).body.verses["matthew-5-14-15"], "câu ngoài bộ chung vẫn đồng bộ được");
  t.env.day = "2026-10-12";
  assert.equal((await m("GET", "/api/me")).body.weekly, null);
  const books = (await m("GET", "/api/bible/books")).body.books;
  assert.equal(books.length, 66);
  assert.equal(books[42].name, "Giăng");
  assert.equal(books[42].chapters[2], 36);
  await t.close();
});

test("quản lý thành viên: mời ra, cử nhóm trưởng, bảo vệ nhóm trưởng cuối, xoá tài khoản", async () => {
  const t = await boot();
  const { leader, code } = await leaderWithGroup(t);
  const p = t.client();
  await p("POST", "/api/auth/pin/join", { code, name: "Quý", pin: "4321" });
  const g = t.client();
  await g("POST", "/api/auth/google", { credential: googleToken({ sub: "g-member", given_name: "Hải" }) });
  assert.equal((await g("POST", "/api/groups/join", { code })).status, 200);
  const members = (await leader("GET", "/api/group")).body.members;
  const id = (n) => members.find((m) => m.name === n).id;
  const leaderId = id("Anh Tú");

  assert.equal((await leader("DELETE", "/api/me")).status, 409, "nhóm trưởng duy nhất không xoá tài khoản được khi còn thành viên");
  assert.equal((await leader("POST", `/api/group/members/${leaderId}/role`, { role: "member" })).status, 409);
  assert.equal((await leader("POST", `/api/group/members/${id("Hải")}/role`, { role: "leader" })).status, 200);
  assert.equal((await g("PATCH", "/api/group", { name: "Thanh niên Bê-tên" })).status, 200, "nhóm trưởng mới đổi được tên nhóm");

  assert.equal((await leader("DELETE", `/api/group/members/${id("Quý")}`)).status, 200);
  assert.equal((await p("GET", "/api/me")).status, 401, "tài khoản chỉ dùng PIN bị xoá luôn");
  assert.equal((await t.client()("POST", "/api/auth/pin/login", { code, name: "Quý", pin: "4321" })).status, 401);

  const oldCode = code;
  const renewed = await leader("POST", "/api/group/code");
  assert.notEqual(renewed.body.group.code, oldCode);
  assert.equal((await t.client()("POST", "/api/auth/pin/join", { code: oldCode, name: "Mới", pin: "1111" })).status, 404, "mã cũ hết hiệu lực");

  assert.equal((await g("PATCH", "/api/me", { name: "Anh Tú" })).status, 409, "đổi tên trùng trong nhóm");
  assert.equal((await g("PATCH", "/api/me", { avatar: "dove" })).body.user.avatar, "dove");
  assert.equal((await g("POST", "/api/group/leave")).status, 200);
  assert.equal((await leader("DELETE", "/api/me")).status, 200, "khi chỉ còn một mình thì xoá được");
  assert.equal(t.db.prepare("SELECT COUNT(*) AS n FROM groups").get().n, 0, "nhóm trống bị xoá");
  await t.close();
});

test("giới hạn số lần đăng nhập theo IP", async () => {
  const t = await boot();
  const c = t.client();
  let last;
  for (let i = 0; i < 21; i++) last = await c("POST", "/api/auth/pin/login", { code: "ABCDEF", name: "Ai đó", pin: "1234" });
  assert.equal(last.status, 429);
  await t.close();
});
