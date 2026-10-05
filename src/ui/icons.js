// Biểu tượng nhỏ (viewBox 24×24) và ảnh đại diện (64×64).
import { AVATAR_BOY } from "./art.js";

const svg = (body, attrs = "") => `<svg viewBox="0 0 24 24" aria-hidden="true" ${attrs}>${body}</svg>`;
const stroke = 'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';

export const ICON = {
  chev: svg(`<path d="M9 6l6 6-6 6" ${stroke}/>`),
  back: svg(`<path d="M15 6l-6 6 6 6" ${stroke}/>`),
  close: svg(`<path d="M6 6l12 12M18 6L6 18" ${stroke}/>`),
  check: svg(`<path d="M5 12.5l4.5 4.5L19 7.5" ${stroke}/>`),
  cross: svg(`<path d="M7 7l10 10M17 7L7 17" ${stroke}/>`),
  people: svg(`<g fill="#3f8a3a"><circle cx="9" cy="8" r="4"/><path d="M1.5 21c0-4.4 3.4-7.5 7.5-7.5s7.5 3.1 7.5 7.5z"/><circle cx="17.5" cy="9" r="3.2" opacity=".75"/><path d="M15.6 13.8c3.9-.7 7 1.9 7 6.2h-4.7c0-2.5-.8-4.6-2.3-6.2z" opacity=".75"/></g>`),
  trophy: svg(`<path d="M7 5H4a3 3 0 0 0 3.5 5M17 5h3a3 3 0 0 1-3.5 5" fill="none" stroke="#c98a1b" stroke-width="2"/><path d="M7 3h10v5.5a5 5 0 0 1-10 0z" fill="#e3a425"/><rect x="11" y="13" width="2" height="4" fill="#c98a1b"/><rect x="7" y="17" width="10" height="4" rx="1" fill="#9a6436"/>`),
  sound: svg(`<path d="M3.5 9h4l5-4v14l-5-4h-4z" fill="#e0703a"/><g fill="none" stroke="#e0703a" stroke-width="2.2" stroke-linecap="round"><path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.6 6.4a7.6 7.6 0 0 1 0 11.2"/></g>`),
  soundOff: svg(`<path d="M3.5 9h4l5-4v14l-5-4h-4z" fill="#e0703a"/><g stroke="#e0703a" stroke-width="2.2" stroke-linecap="round"><path d="M16 9.5l5 5M21 9.5l-5 5"/></g>`),
  gear: svg(`<g fill="#3a7bbf"><rect x="10" y="1.5" width="4" height="21" rx="1.5"/><rect x="10" y="1.5" width="4" height="21" rx="1.5" transform="rotate(45 12 12)"/><rect x="10" y="1.5" width="4" height="21" rx="1.5" transform="rotate(90 12 12)"/><rect x="10" y="1.5" width="4" height="21" rx="1.5" transform="rotate(135 12 12)"/><circle cx="12" cy="12" r="7"/></g><circle cx="12" cy="12" r="3" fill="#fff"/>`),
  book: svg(`<g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M2.5 5.5c3-1.2 6.3-1 9.5 1.2 3.2-2.2 6.5-2.4 9.5-1.2v13.4c-3-1.2-6.3-1-9.5 1.2-3.2-2.2-6.5-2.4-9.5-1.2z"/><path d="M12 6.7v13.4"/></g>`),
  scroll: svg(`<rect x="5" y="4" width="14" height="16" fill="#fbefd0" stroke="#8b5e34" stroke-width="1.8"/><rect x="3" y="2.5" width="18" height="4" rx="2" fill="#e2c07f" stroke="#8b5e34" stroke-width="1.6"/><rect x="3" y="17.5" width="18" height="4" rx="2" fill="#e2c07f" stroke="#8b5e34" stroke-width="1.6"/><path d="M8 10h8M8 13.5h6" stroke="#c2412d" stroke-width="1.8" stroke-linecap="round"/>`),
  group: svg(`<circle cx="12" cy="12" r="11" fill="#3a7bbf"/><circle cx="9.5" cy="10" r="2.6" fill="#fff"/><path d="M5 17.5c0-2.6 2-4.3 4.5-4.3s4.5 1.7 4.5 4.3z" fill="#fff"/><circle cx="15.5" cy="10.5" r="2" fill="#fff" opacity=".8"/><path d="M14.6 13.5c2.4-.3 4.4 1.2 4.4 3.9h-3.3c0-1.5-.4-2.8-1.1-3.9z" fill="#fff" opacity=".8"/>`),
  star: svg(`<path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.5l1.3-6.6L2.5 9.3l6.6-.8z" fill="#e3a425"/>`),
  starEmpty: svg(`<path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.5l1.3-6.6L2.5 9.3l6.6-.8z" fill="#e5dac3"/>`),
  flame: svg(`<path d="M12 2c1 4 6 6.5 6 12a6 6 0 0 1-12 0c0-3 1.5-5 3-6 0 2 1 3 2 3 0-3-1-6 1-9z" fill="#e8692e"/>`),
  bulb: svg(`<path d="M9 18h6M10 21h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" fill="#e3a425"/>`),
  eye: svg(`<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="currentColor"/>`),
  listen: svg(`<path d="M3.5 9h4l5-4v14l-5-4h-4z" fill="currentColor"/><path d="M16 9a4 4 0 0 1 0 6M18.6 6.4a7.6 7.6 0 0 1 0 11.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`),
  refresh: svg(`<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" ${stroke}/>`),
  home: svg(`<path d="M3 11l9-7 9 7M5 9.5V20h5v-6h4v6h5V9.5" ${stroke}/>`),
  crown: svg(`<path d="M3 18h18l-1.6-10.5-4.6 4.2L12 5l-2.8 6.7-4.6-4.2z" fill="#e3a425"/>`),
  seed: svg(`<path d="M12 21V11" stroke="#6b8e3a" stroke-width="2.4" stroke-linecap="round"/><path d="M12 13C12 8 8 5 3 5c0 5 4 8 9 8zM12 11c0-4 3-7 8-7 0 4-3 7-8 7z" fill="#7d9a45"/>`),
  level: svg(`<circle cx="12" cy="12" r="10" fill="#3f8a3a"/><path d="M7 14l5-5 5 5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`),
  dove: svg(`<path d="M3 14c3 0 5-2 7-5 1.5-2.5 4-4 7-3l3-1-1 3c1 3-1 7-6 8-3 .6-6 0-10-2z" fill="#fff" stroke="#9fb0bb" stroke-width="1.5" stroke-linejoin="round"/><path d="M19 7l3 1-3 1" fill="#f0a03a"/><circle cx="16.5" cy="7.5" r="1" fill="#3a2a22"/>`),
  goal: svg(`<circle cx="12" cy="12" r="10" fill="none" stroke="#3f8a3a" stroke-width="2.5"/><circle cx="12" cy="12" r="5.5" fill="none" stroke="#3f8a3a" stroke-width="2.5"/><circle cx="12" cy="12" r="1.8" fill="#3f8a3a"/>`),
  medal: (fill, ribbon) => svg(`<circle cx="12" cy="14" r="7" fill="${fill}"/><path d="M8 2h3l1 5-3 1zM16 2h-3l-1 5 3 1z" fill="${ribbon}"/>`),
};

export const BADGE_ICON = {
  seed: ICON.seed, star: ICON.star, flame: ICON.flame, scroll: ICON.scroll, crown: ICON.crown, level: ICON.level, dove: ICON.dove,
};

const face = (bg, body) => `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" fill="${bg}"/>${body}</svg>`;

export const AVATARS = {
  boy: `<svg viewBox="0 0 64 64" aria-hidden="true">${AVATAR_BOY}</svg>`,
  girl: face("#f6dfe6", `<path d="M14 40c-4-18 6-28 18-28s22 10 18 28c-2 8-6 12-6 12H20s-4-4-6-12z" fill="#5a3825"/><path d="M10 64c2-13 11-18 22-18s20 5 22 18z" fill="#c2412d"/><path d="M26 44h12v6a6 6 0 0 1-12 0z" fill="#efc59c"/><circle cx="32" cy="30" r="15" fill="#f5d0a9"/><path d="M17 28c0-9 7-15 15-15s15 6 15 15c-5-6-11-7-15-7s-10 1-15 7z" fill="#5a3825"/><circle cx="26.5" cy="32" r="2" fill="#3b2a20"/><circle cx="37.5" cy="32" r="2" fill="#3b2a20"/><path d="M28 38q4 3 8 0" fill="none" stroke="#3b2a20" stroke-width="2" stroke-linecap="round"/><ellipse cx="22.5" cy="36.5" rx="3" ry="1.8" fill="#f4a3a3"/><ellipse cx="41.5" cy="36.5" rx="3" ry="1.8" fill="#f4a3a3"/><path d="M42 15l6-4 1 7zM42 15l2 7 5-2z" fill="#e3a425"/>`),
  lamb: face("#dff0e0", `<ellipse cx="14" cy="30" rx="9" ry="5" transform="rotate(-25 14 30)" fill="#f2d7c2"/><ellipse cx="50" cy="30" rx="9" ry="5" transform="rotate(25 50 30)" fill="#f2d7c2"/><ellipse cx="32" cy="38" rx="17" ry="16" fill="#f7e4cf"/><g fill="#fffdf6" stroke="#d8c8b0" stroke-width="2"><circle cx="24" cy="22" r="7"/><circle cx="40" cy="22" r="7"/><circle cx="32" cy="18" r="8"/></g><ellipse cx="26" cy="38" rx="2.6" ry="3.2" fill="#3a2a22"/><ellipse cx="38" cy="38" rx="2.6" ry="3.2" fill="#3a2a22"/><ellipse cx="21" cy="44" rx="3" ry="1.8" fill="#f4a3a3"/><ellipse cx="43" cy="44" rx="3" ry="1.8" fill="#f4a3a3"/><path d="M29 46q3 3 6 0" fill="none" stroke="#3a2a22" stroke-width="2" stroke-linecap="round"/><path d="M14 62c4-6 10-8 18-8s14 2 18 8z" fill="#c2412d"/>`),
  dove: face("#d7ecf2", `<path d="M10 46c8 0 13-5 17-12 4-7 11-11 19-9l9-3-3 8c3 9-3 18-16 21-8 1.6-16 0-26-5z" fill="#fff" stroke="#b9c6cf" stroke-width="2" stroke-linejoin="round"/><path d="M52 27l8 3-8 3z" fill="#f0a03a"/><circle cx="46" cy="28" r="2.4" fill="#3a2a22"/><path d="M22 42q10-10 20-8" fill="none" stroke="#b9c6cf" stroke-width="2" stroke-linecap="round"/><path d="M56 33q4 4 6 2" stroke="#6b7d3a" stroke-width="2" fill="none"/><ellipse cx="59" cy="37" rx="3" ry="1.5" fill="#7d9a45"/>`),
};

export const AVATAR_NAMES = { boy: "Bạn trai", girl: "Bạn gái", lamb: "Chiên con", dove: "Bồ câu" };
