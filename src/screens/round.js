// Khung chung cho một lượt chơi: nút thoát, thanh tiến độ, XP, thanh phản hồi ở đáy.
import { go } from "../router.js";
import { esc } from "../ui/dom.js";
import { ICON } from "../ui/icons.js";
import { confirmModal } from "../ui/feedback.js";

export function mountRound(root, { mode, total, isDirty = () => false }) {
  root.innerHTML = `<section class="play ${mode}">
      <div class="play-bar">
        <button class="icon-btn" type="button" data-exit aria-label="Thoát lượt chơi">${ICON.close}</button>
        <div class="progress" role="progressbar" aria-label="Tiến độ lượt chơi" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="0"><i></i></div>
        <span class="xp-pill" aria-live="polite">${ICON.star}<span data-xp>0</span> XP</span>
      </div>
      <div data-stage></div>
    </section>
    <div data-fb></div>`;
  const stage = root.querySelector("[data-stage]");
  const fbHost = root.querySelector("[data-fb]");
  const bar = root.querySelector(".progress");

  root.querySelector("[data-exit]").addEventListener("click", async () => {
    if (!isDirty() || (await confirmModal({ title: "Thoát lượt chơi?", text: "Kết quả của lượt này sẽ không được lưu.", ok: "Thoát", cancel: "Chơi tiếp", danger: true }))) {
      go("");
    }
  });

  return {
    stage,
    progress(done) {
      bar.firstElementChild.style.width = `${(done / total) * 100}%`;
      bar.setAttribute("aria-valuenow", done);
    },
    xp(n) {
      root.querySelector("[data-xp]").textContent = n;
    },
    feedback({ ok, title, text = "", next = "Tiếp tục", onNext }) {
      fbHost.innerHTML = `<div class="fb ${ok ? "" : "bad"}" role="status">
        <div class="fb-inner">
          <div class="fb-msg"><span class="fb-icon">${ok ? ICON.check : ICON.cross}</span>
            <div><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ""}</div></div>
          <button class="btn ${ok ? "green" : "red"}" type="button" data-next>${esc(next)} ${ICON.chev}</button>
        </div></div>`;
      const btn = fbHost.querySelector("[data-next]");
      btn.addEventListener("click", () => { fbHost.innerHTML = ""; onNext(); }, { once: true });
      btn.focus({ preventScroll: true });
    },
  };
}
