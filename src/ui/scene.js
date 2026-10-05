// Cảnh nền: dây cờ, đá lát sân, bóng lá và hạt ma-na rơi.
import { mulberry32 } from "../lib/random.js";

const NS = "http://www.w3.org/2000/svg";

function el(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  parent.appendChild(n);
  return n;
}

function decorate() {
  const rnd = mulberry32(7);
  const flags = document.getElementById("flags");
  const colors = ["#c2412d", "#e3a425", "#3f8a3a", "#4f87a6", "#fbefd9", "#6f5aa0"];
  const P0 = [188, 246], P1 = [800, 430], P2 = [1414, 230];
  for (let i = 0, t = 0.03; t < 0.98; t += 0.034, i++) {
    const x = (1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0];
    const y = (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1];
    el("path", { d: `M${x - 11} ${y} L${x + 11} ${y} L${x} ${y + 26} Z`, fill: colors[i % colors.length] }, flags);
  }
  const scallop = document.getElementById("scallop");
  for (let x = 152, i = 0; x < 392; x += 20, i++) el("circle", { cx: x + 10, cy: 612, r: 10, fill: i % 2 ? "#fbefd9" : "#c94a35" }, scallop);
  const cobbles = document.getElementById("cobbles");
  for (let y = 800, row = 0; y < 1000; row++) {
    const k = 0.7 + ((y - 780) / 220) * 0.7;
    for (let x = (row % 2) * 26 * k - 20; x < 1620; x += 56 * k) {
      el("ellipse", { cx: x + rnd() * 6, cy: y, rx: (20 + rnd() * 6) * k, ry: (6 + rnd() * 2) * k, fill: "#d9b27c", opacity: 0.55 }, cobbles);
    }
    y += 20 * k;
  }
  const dapple = document.getElementById("dapple");
  for (let i = 0; i < 16; i++) {
    el("ellipse", { cx: 280 + rnd() * 1040, cy: 800 + rnd() * 180, rx: 30 + rnd() * 70, ry: 8 + rnd() * 16, opacity: 0.12 + rnd() * 0.14 }, dapple);
  }
}

function manna() {
  const cv = document.getElementById("manna");
  const ctx = cv.getContext("2d");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W, H, flakes = [], running = false;
  const size = () => {
    const d = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * d; cv.height = H * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    const n = Math.round(Math.min(70, W / 22));
    flakes = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: 1.2 + Math.random() * 2.2, v: 0.2 + Math.random() * 0.45,
      a: Math.random() * 6.28, s: 0.4 + Math.random() * 0.8, o: 0.45 + Math.random() * 0.45,
    }));
  };
  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    ctx.shadowColor = "rgba(255,248,220,.95)";
    ctx.shadowBlur = 6;
    ctx.fillStyle = "#fffdf2";
    for (const f of flakes) {
      if (!still) {
        f.y += f.v; f.a += 0.012; f.x += Math.sin(f.a) * f.s * 0.3;
        if (f.y > H + 6) { f.y = -6; f.x = Math.random() * W; }
      }
      ctx.globalAlpha = f.o;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, 6.283);
      ctx.fill();
    }
    if (!still && !document.hidden) requestAnimationFrame(draw);
    else running = false;
  };
  const start = () => { if (!running) { running = true; requestAnimationFrame(draw); } };
  size();
  start();
  addEventListener("resize", () => { size(); if (still) draw(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !still) start(); });
}

export function initScene() {
  decorate();
  manna();
}
