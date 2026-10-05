// Âm thanh tạo bằng WebAudio (không cần file) và đọc câu bằng giọng tiếng Việt của thiết bị.

let ctx;
let enabled = () => true;

export function setSoundEnabled(getter) {
  enabled = getter;
}

function tone(freq, at, dur, type = "triangle", gain = 0.14) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(ctx.destination);
  o.start(at);
  o.stop(at + dur + 0.02);
}

const SONGS = {
  tap: [[520, 0, 0.06, "sine", 0.05]],
  correct: [[660, 0, 0.12], [880, 0.09, 0.18]],
  wrong: [[230, 0, 0.16, "square", 0.04], [180, 0.12, 0.2, "square", 0.04]],
  complete: [[523, 0, 0.16], [659, 0.11, 0.16], [784, 0.22, 0.16], [1047, 0.33, 0.3]],
  level: [[523, 0, 0.12], [659, 0.1, 0.12], [784, 0.2, 0.12], [1047, 0.3, 0.14], [784, 0.42, 0.1], [1047, 0.52, 0.36]],
  flip: [[440, 0, 0.08, "sine", 0.05], [560, 0.05, 0.08, "sine", 0.05]],
};

export function play(name) {
  if (!enabled() || !SONGS[name]) return;
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime + 0.01;
    for (const [f, d, len, type, gain] of SONGS[name]) tone(f, t + d, len, type, gain);
  } catch {
    /* trình duyệt chặn âm thanh */
  }
}

export const canSpeak = () => "speechSynthesis" in window;

// Trả về false nếu thiết bị không có giọng tiếng Việt.
export function speak(text) {
  if (!canSpeak()) return false;
  const voice = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith("vi"));
  if (!voice) return false;
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.9;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
  return true;
}

if (canSpeak()) speechSynthesis.getVoices();
