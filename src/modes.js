// Thông tin hiển thị của các chế độ chơi.
export const MODES = {
  fill: {
    name: "Điền Từ", color: "green", cta: "Chọn chủ đề",
    desc: "Chọn một chủ đề, rồi điền những từ còn thiếu trong câu gốc.",
    levels: ["1 ô trống mỗi câu (câu dài thêm 1 ô)", "2 ô trống mỗi câu (câu dài thêm 1 ô)", "3 ô trống mỗi câu (câu dài thêm 1 ô)"],
  },
  order: {
    name: "Xếp Câu", color: "red", cta: "Xếp câu",
    desc: "Sắp các cụm từ về đúng thứ tự của câu Kinh Thánh.",
    levels: ["3–4 mảnh lớn", "Mảnh cắt theo dấu câu", "Nhiều mảnh nhỏ, mỗi mảnh 2–3 từ"],
  },
  recall: {
    name: "Thuộc Lòng", color: "teal", cta: "Thử thách",
    desc: "Chỉ còn chữ cái đầu làm gợi ý. Bạn có gõ lại được cả câu?",
    levels: ["Gợi ý chữ cái đầu và dấu câu", "Chỉ gợi ý chữ cái đầu", "Không gợi ý, chỉ biết số từ"],
  },
  review: {
    name: "Góc Ôn Tập", color: "plum", cta: "Ôn tập",
    desc: "Lật thẻ ghi nhớ và xem bạn đã thuộc bao nhiêu câu.",
  },
};

export const LEVEL_NAMES = ["Dễ", "Vừa", "Khó"];

export const clampLevel = (x) => Math.min(3, Math.max(1, Number(x) || 2));
