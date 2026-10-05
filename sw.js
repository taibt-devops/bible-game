// Service worker: cache khung app để chơi khi mất mạng.
// Tăng VERSION mỗi khi phát hành bản mới để người chơi nhận code mới.
const VERSION = "manna-v1";
const SHELL = [
  "./", "index.html", "manifest.webmanifest", "assets/icon.svg",
  "styles/base.css", "styles/game.css",
  "src/main.js", "src/config.js", "src/modes.js", "src/game.js", "src/router.js",
  "src/data/verses.js",
  "src/lib/text.js", "src/lib/progress.js", "src/lib/random.js", "src/lib/store.js", "src/lib/sound.js",
  "src/ui/art.js", "src/ui/dom.js", "src/ui/feedback.js", "src/ui/icons.js", "src/ui/scene.js", "src/ui/ticker.js",
  "src/screens/home.js", "src/screens/picker.js", "src/screens/round.js", "src/screens/result.js",
  "src/screens/fill.js", "src/screens/order.js", "src/screens/recall.js", "src/screens/review.js", "src/screens/profile.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== "manna-fonts").map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    // Phông chữ: dùng bản đã lưu, cập nhật ngầm.
    e.respondWith(caches.open("manna-fonts").then(async (c) => {
      const hit = await c.match(e.request);
      const net = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // Khung app: ưu tiên mạng để luôn có bản mới, mất mạng thì dùng cache.
  e.respondWith(
    fetch(e.request)
      .then((r) => { if (r.ok) caches.open(VERSION).then((c) => c.put(e.request, r.clone())); return r; })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("index.html"))),
  );
});
