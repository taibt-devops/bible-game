// Khởi động Manna.
import { store } from "./game.js";
import { startRouter } from "./router.js";
import { setSoundEnabled } from "./lib/sound.js";
import { initScene } from "./ui/scene.js";
import { renderTicker } from "./ui/ticker.js";
import { homeScreen } from "./screens/home.js";
import { fillScreen } from "./screens/fill.js";
import { orderScreen } from "./screens/order.js";
import { recallScreen } from "./screens/recall.js";
import { reviewScreen } from "./screens/review.js";
import { initAccount, onAccount } from "./net/account.js";

setSoundEnabled(() => store.get().settings.sound);

function applySettings(s) {
  document.body.classList.toggle("big-text", !!s.settings.bigText);
  renderTicker(s);
}

store.subscribe(applySettings);
applySettings(store.get());
onAccount(() => renderTicker(store.get()));
initScene();

startRouter(
  {
    "": homeScreen,
    "play/fill": fillScreen,
    "play/order": orderScreen,
    "play/recall": recallScreen,
    review: reviewScreen,
  },
  document.getElementById("app"),
  document.getElementById("deco"),
);

initAccount();

// Chơi offline: chỉ đăng ký service worker khi chạy thật (không phải máy dev).
const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
if ("serviceWorker" in navigator && location.protocol === "https:" && !isLocal) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
