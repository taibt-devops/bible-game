// Cấu hình chung. Đổi ở đây, không cần sửa code khác.
export const CONFIG = {
  appName: "Manna",
  // Link nhóm thanh niên (Facebook/Zalo). Để trống thì ẩn nút "Tham gia nhóm".
  groupUrl: "",
  roundSize: { fill: 6, order: 4, recall: 3 },
  xp: {
    // Cân bằng để mỗi lượt của 3 chế độ cho khoảng 60–90 XP.
    fillBlank: 5, combo: 2,
    orderClean: 20, orderAssisted: 8,
    recallMax: 25, peekPenalty: 5,
    flashKnown: 5, votdBonus: 20,
  },
  recallPass: 0.9,
  peekSeconds: 5,
  reviewSession: { due: 10, fresh: 5 },
  dailyGoals: [30, 50, 100],
};
