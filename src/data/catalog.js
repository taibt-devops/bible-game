// Danh mục câu đang dùng: bộ câu chung + câu gốc tuần của nhóm (lưu trên máy để chơi khi mất mạng).
import { VERSES, TOPICS } from "./verses.js";

export const GROUP_TOPIC = { id: "group", name: "Câu của nhóm" };
const BASE_IDS = new Set(VERSES.map((v) => v.id));
let extra = [];
let all = VERSES;

export function setExtraVerses(map = {}) {
  const next = Object.values(map).filter((v) => v && !BASE_IDS.has(v.id));
  if (next.length === extra.length && next.every((v, i) => v.id === extra[i].id)) return;
  extra = next;
  all = [...VERSES, ...extra];
}

export const allVerses = () => all;
export const allTopics = () => (extra.length ? [...TOPICS, GROUP_TOPIC] : TOPICS);
export const findVerse = (id) => all.find((v) => v.id === id);
export const isBaseVerse = (id) => BASE_IDS.has(id);
