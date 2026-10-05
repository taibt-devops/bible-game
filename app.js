"use strict";
const $app = document.getElementById("app");
const KEY = "manna.v1";
const DEFAULTS = { name: "Bạn trẻ", xp: 0, streak: 0, last: "", mastered: {}, sound: true, topic: "Tất cả" };
let S = load();

function load() {
  try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY) || "{}")); }
  catch { return { ...DEFAULTS }; }
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

/* ---------- helpers ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const TOPICS = ["Tất cả", ...new Set(VERSES.map(v => v.topic))];
const pool = () => S.topic === "Tất cả" ? VERSES : VERSES.filter(v => v.topic === S.topic);
const parts = w => w.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u).slice(1);
const core = w => parts(w)[1].toLowerCase().normalize("NFC");
const today = (d = new Date()) => d.toISOString().slice(0, 10);

function level(xp) {
  let l = 1, need = 100;
  while (xp >= need) { xp -= need; l++; need = 100 + 50 * (l - 1); }
  return { l, cur: xp, need };
}
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1800);
}
function beep(ok) {
  if (!S.sound) return;
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)();
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.value = ok ? 660 : 200; o.type = "triangle";
    g.gain.setValueAtTime(.15, c.currentTime); g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .25);
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + .25);
  } catch {}
}
function addXP(n) {
  const before = level(S.xp).l;
  S.xp += n;
  const d = today();
  if (S.last !== d) {
    const y = new Date(); y.setDate(y.getDate() - 1);
    S.streak = S.last === today(y) ? S.streak + 1 : 1;
    S.last = d;
  }
  save();
  if (level(S.xp).l > before) setTimeout(() => toast("🎉 Lên cấp " + level(S.xp).l + "!"), 300);
}
const master = ref => { S.mastered[ref] = (S.mastered[ref] || 0) + 1; save(); };
const stars = ref => "★".repeat(Math.min(5, S.mastered[ref] || 0)) + "☆".repeat(5 - Math.min(5, S.mastered[ref] || 0));

/* ---------- shared UI ---------- */
function frame(title, pct, body) {
  $app.innerHTML = `<div class="bar"><button class="back" id="back">← Trang chủ</button>
    <div class="prog"><i style="width:${pct}%"></i></div><b>${title}</b></div>${body}`;
  document.getElementById("back").onclick = home;
}
function result(title, score, total, xp, again) {
  addXP(xp);
  const emoji = score === total ? "🏆" : score >= total / 2 ? "🌟" : "🌱";
  $app.innerHTML = `<div class="board result"><div class="big">${emoji}</div><h2>${title}</h2>
    <p>Đúng ${score}/${total}</p><div class="xp">+${xp} XP</div>
    <div class="row"><button class="btn" id="again">Chơi tiếp</button><button class="btn ghost" id="home">Trang chủ</button></div></div>`;
  document.getElementById("again").onclick = again;
  document.getElementById("home").onclick = home;
}
function modal(html) {
  const m = document.createElement("div");
  m.className = "modal"; m.innerHTML = `<div class="board">${html}</div>`;
  m.onclick = e => { if (e.target === m) m.remove(); };
  document.body.appendChild(m); return m;
}

/* ---------- home ---------- */
function home() {
  const { l, cur, need } = level(S.xp);
  const v = VERSES[Math.floor(Date.now() / 864e5) % VERSES.length];
  document.getElementById("ticker").innerHTML = `📖 Câu gốc hôm nay: <b>${v.ref}</b> — hãy thử học thuộc nhé!`;
  const modes = [
    ["📖", "Điền từ", "Chọn đúng từ còn thiếu trong câu gốc.", "ĐIỀN TỪ", "", quiz],
    ["🧩", "Xếp câu", "Sắp xếp các cụm từ thành câu gốc hoàn chỉnh.", "XẾP CÂU", "red", sort],
    ["✍️", "Gõ thuộc lòng", "Chỉ có chữ cái đầu gợi ý, hãy gõ lại cả câu!", "GÕ LẠI", "", type],
    ["🗂️", "Ôn tập", "Thẻ ghi nhớ và tiến độ thuộc của từng câu.", "ÔN TẬP", "purple", review],
  ];
  $app.innerHTML = `
  <div class="top">
    <div class="profile" id="prof"><div class="avatar">🕊️</div><div>
      <div class="pname">${esc(S.name)}<small>⭐ Lv. ${l}</small><span class="streak">🔥 ${S.streak} ngày</span></div>
      <div class="xpbar"><i style="width:${cur / need * 100}%"></i></div><div class="xptxt">${cur} / ${need} XP</div></div></div>
    <div class="icons"><button class="icon" id="set" title="Cài đặt">⚙️</button></div>
  </div>
  <div class="logo"><h1>MANNA</h1><p>HỌC THUỘC CÂU GỐC</p></div>
  <div class="chips">${TOPICS.map(t => `<button class="chip ${t === S.topic ? "on" : ""}" data-t="${t}">${t}</button>`).join("")}</div>
  <div class="cards">${modes.map((m, i) => `<div class="card"><span class="em">${m[0]}</span><h2>${m[1]}</h2><p>${m[2]}</p>
    <button class="btn ${m[4]}" data-m="${i}">${m[3]} ›</button></div>`).join("")}</div>
  <div class="votd">📜 <b>${v.ref}</b> — ${esc(v.text)}</div>
  <div class="mascots l">🐑</div><div class="mascots r">🕊️</div>`;
  $app.querySelectorAll(".chip").forEach(b => b.onclick = () => { S.topic = b.dataset.t; save(); home(); });
  $app.querySelectorAll("[data-m]").forEach(b => b.onclick = () => modes[b.dataset.m][5]());
  const settings = () => {
    const m = modal(`<h2>Cài đặt</h2><label>Tên của bạn</label>
      <input type="text" id="nm" maxlength="20" value="${esc(S.name)}">
      <label><input type="checkbox" id="snd" ${S.sound ? "checked" : ""}> Âm thanh</label>
      <div class="row"><button class="btn" id="ok">Lưu</button><button class="btn red" id="rs">Xóa tiến độ</button></div>`);
    m.querySelector("#ok").onclick = () => { S.name = m.querySelector("#nm").value.trim() || "Bạn trẻ"; S.sound = m.querySelector("#snd").checked; save(); m.remove(); home(); };
    m.querySelector("#rs").onclick = () => { if (confirm("Xóa toàn bộ tiến độ?")) { S = { ...DEFAULTS }; save(); m.remove(); home(); } };
  };
  document.getElementById("prof").onclick = settings;
  document.getElementById("set").onclick = settings;
}

/* ---------- mode 1: điền từ ---------- */
function quiz() {
  const qs = shuffle(pool()).slice(0, 6);
  const allWords = [...new Set(VERSES.flatMap(v => v.text.split(" ").map(core)).filter(w => w.length >= 3))];
  let i = 0, right = 0, xp = 0;
  const next = () => {
    if (i >= qs.length) return result("Điền từ", Math.round(right), qs.length, xp, quiz);
    const v = qs[i], words = v.text.split(" ");
    const cand = words.map((_, k) => k).filter(k => core(words[k]).length >= 3);
    const nb = Math.min(cand.length, words.length > 25 ? 3 : words.length > 12 ? 2 : 1);
    const blanks = shuffle(cand).slice(0, nb).sort((a, b) => a - b);
    const state = {}; let b = 0, allOk = true;
    const draw = () => {
      const sent = words.map((w, k) => {
        if (!blanks.includes(k)) return esc(w);
        const [lead, c, trail] = parts(w);
        const st = state[k];
        return `${esc(lead)}<span class="blank ${st || ""}">${st ? esc(c) : "&nbsp;"}</span>${esc(trail)}`;
      }).join(" ");
      const target = core(words[blanks[b]]);
      const opts = shuffle([target, ...shuffle(allWords.filter(x => x !== target)).slice(0, 3)]);
      frame("Điền từ", i / qs.length * 100, `<div class="board"><div class="ref">${v.ref}</div>
        <div class="verse">${sent}</div><div class="opts">${opts.map(o => `<button class="opt">${esc(o)}</button>`).join("")}</div></div>`);
      $app.querySelectorAll(".opt").forEach(btn => btn.onclick = () => {
        const ok = btn.textContent === target;
        beep(ok); btn.classList.add(ok ? "ok" : "bad");
        state[blanks[b]] = ok ? "ok" : "bad";
        if (ok) { right += 1 / nb; xp += Math.round(10 / nb); } else allOk = false;
        $app.querySelectorAll(".opt").forEach(x => x.disabled = true);
        setTimeout(() => {
          b++;
          if (b >= nb) { if (allOk) master(v.ref); i++; next(); } else draw();
        }, 700);
      });
    };
    draw();
  };
  next();
}

/* ---------- mode 2: xếp câu ---------- */
function chunkify(text) {
  let ch = text.split(/(?<=[,;:.?!])\s+/);
  const merged = [];
  for (const c of ch) {
    if (merged.length && c.split(" ").length < 2) merged[merged.length - 1] += " " + c;
    else merged.push(c);
  }
  if (merged.length >= 3) return merged;
  const w = text.split(" "), out = [];
  for (let k = 0; k < w.length; k += 3) out.push(w.slice(k, k + 3).join(" "));
  return out;
}
function sort() {
  const qs = shuffle(pool()).slice(0, 4);
  let i = 0, right = 0, xp = 0;
  const next = () => {
    if (i >= qs.length) return result("Xếp câu", right, qs.length, xp, sort);
    const v = qs[i], chunks = chunkify(v.text);
    let bank = shuffle(chunks.map((t, id) => ({ t, id }))), ans = [], tries = 0;
    const draw = () => {
      frame("Xếp câu", i / qs.length * 100, `<div class="board"><div class="ref">${v.ref}</div>
        <p>Chạm vào các cụm từ theo đúng thứ tự:</p>
        <div class="tiles ans" id="ans">${ans.map(x => `<button class="tile" data-a="${x.id}">${esc(x.t)}</button>`).join("")}</div>
        <div class="tiles" id="bank">${bank.map(x => `<button class="tile" data-b="${x.id}">${esc(x.t)}</button>`).join("")}</div>
        <div class="row"><button class="btn" id="chk" ${bank.length ? "disabled" : ""}>KIỂM TRA</button></div></div>`);
      $app.querySelectorAll("[data-b]").forEach(el => el.onclick = () => {
        const x = bank.find(t => t.id == el.dataset.b); bank = bank.filter(t => t !== x); ans.push(x); draw();
      });
      $app.querySelectorAll("[data-a]").forEach(el => el.onclick = () => {
        const x = ans.find(t => t.id == el.dataset.a); ans = ans.filter(t => t !== x); bank.push(x); draw();
      });
      document.getElementById("chk").onclick = () => {
        const ok = ans.map(x => x.t).join(" ") === chunks.join(" ");
        beep(ok);
        if (ok) {
          if (!tries) { right++; xp += 15; master(v.ref); } else xp += 5;
          toast("✔ Chính xác!"); i++; next();
        } else {
          tries++; document.getElementById("ans").classList.add("shake");
          setTimeout(() => { bank = shuffle(chunks.map((t, id) => ({ t, id }))); ans = []; draw(); }, 600);
        }
      };
    };
    draw();
  };
  next();
}

/* ---------- mode 3: gõ thuộc lòng ---------- */
function lcsMatch(a, b) {
  const n = a.length, m = b.length, dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const hit = new Set(); let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { hit.add(i); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  return hit;
}
function type() {
  const qs = shuffle(pool()).slice(0, 3);
  let i = 0, right = 0, xp = 0;
  const next = () => {
    if (i >= qs.length) return result("Gõ thuộc lòng", right, qs.length, xp, type);
    const v = qs[i], words = v.text.split(" ");
    const hint = words.map(w => { const [l, c, t] = parts(w); return esc(l) + esc(c[0] || "") + "…" + esc(t); }).join(" ");
    frame("Gõ thuộc lòng", i / qs.length * 100, `<div class="board"><div class="ref">${v.ref}</div>
      <div class="hint" id="hint">${hint}</div>
      <textarea id="inp" placeholder="Gõ lại câu gốc từ trí nhớ..."></textarea>
      <div class="row"><button class="btn ghost" id="peek">💡 Xem gợi ý (-5 XP)</button><button class="btn" id="chk">KIỂM TRA</button></div></div>`);
    let penalty = 0;
    document.getElementById("peek").onclick = () => {
      if (penalty) return; penalty = 5;
      document.getElementById("hint").innerHTML = esc(v.text);
      setTimeout(() => { const h = document.getElementById("hint"); if (h) h.innerHTML = hint; }, 5000);
    };
    document.getElementById("chk").onclick = () => {
      const got = document.getElementById("inp").value.split(/\s+/).filter(Boolean).map(core);
      const want = words.map(core), hit = lcsMatch(want, got);
      const acc = hit.size / want.length, pass = acc >= .9;
      beep(pass);
      const xpGain = Math.max(0, Math.round(acc * 20) - penalty);
      if (pass) { right++; master(v.ref); }
      xp += xpGain;
      frame("Gõ thuộc lòng", (i + 1) / qs.length * 100, `<div class="board"><div class="ref">${v.ref}</div>
        <h2>${pass ? "🎉 Tuyệt vời!" : "Cố lên, gần được rồi!"} ${Math.round(acc * 100)}%</h2>
        <div class="verse">${words.map((w, k) => `<span class="${hit.has(k) ? "good" : "miss"}">${esc(w)}</span>`).join(" ")}</div>
        <div class="row"><button class="btn" id="nx">${i + 1 >= qs.length ? "Xem kết quả" : "Câu tiếp"}</button></div></div>`);
      document.getElementById("nx").onclick = () => { i++; next(); };
    };
  };
  next();
}

/* ---------- mode 4: ôn tập ---------- */
function review() {
  const list = pool();
  frame("Ôn tập", 0, `<div class="board"><h2>Thư viện câu gốc</h2>
    <p>Mỗi lần thuộc đúng ở các trò chơi sẽ thêm 1 sao.</p>
    <div class="row"><button class="btn purple" id="deck">🗂️ Lật thẻ ôn tập</button></div>
    <div class="list">${list.map(v => `<div class="li"><span>${v.ref} <small>· ${v.topic}</small></span><span class="stars">${stars(v.ref)}</span></div>`).join("")}</div></div>`);
  document.getElementById("deck").onclick = deck;
}
function deck() {
  const cards = shuffle(pool());
  let i = 0, known = 0, flipped = false;
  const draw = () => {
    if (i >= cards.length) { return result("Ôn tập", known, cards.length, known * 5, deck); }
    const v = cards[i];
    frame("Ôn tập", i / cards.length * 100, `<div class="board"><div class="flash">
      <div class="face ${flipped ? "" : "front"}" id="face">${flipped ? esc(v.text) : v.ref}</div></div>
      <p style="text-align:center">${flipped ? "Bạn đã thuộc chưa?" : "Chạm vào thẻ để lật"}</p>
      <div class="row">${flipped ? `<button class="btn red" id="no">Chưa thuộc</button><button class="btn" id="yes">Đã thuộc</button>` : ""}</div></div>`);
    document.getElementById("face").onclick = () => { flipped = !flipped; draw(); };
    if (flipped) {
      document.getElementById("yes").onclick = () => { known++; master(v.ref); flipped = false; i++; draw(); };
      document.getElementById("no").onclick = () => { flipped = false; i++; draw(); };
    }
  };
  draw();
}

home();
