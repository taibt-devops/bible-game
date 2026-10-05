// Danh sách câu gốc (Bản Truyền Thống 1925). Thêm câu mới bằng cách thêm 1 dòng vào mảng.
// Nên đối chiếu lại với bản Kinh Thánh bạn dùng trước khi phát hành.
const VERSES = [
  { ref: "Giăng 3:16", topic: "Tình yêu", text: "Vì Đức Chúa Trời yêu thương thế gian, nên đã ban Con một của Ngài, hầu cho hễ ai tin Con ấy không bị hư mất mà được sự sống đời đời." },
  { ref: "1 Giăng 4:19", topic: "Tình yêu", text: "Chúng ta yêu, vì Chúa đã yêu chúng ta trước." },
  { ref: "Ê-phê-sô 2:8", topic: "Tình yêu", text: "Vả, ấy là nhờ ân điển, bởi đức tin, mà anh em được cứu, điều đó không phải đến từ anh em, bèn là sự ban cho của Đức Chúa Trời." },
  { ref: "Thi Thiên 23:1", topic: "Bình an", text: "Đức Giê-hô-va là Đấng chăn giữ tôi, tôi sẽ không thiếu thốn gì." },
  { ref: "Ma-thi-ơ 11:28", topic: "Bình an", text: "Hỡi những kẻ mệt mỏi và gánh nặng, hãy đến cùng ta, ta sẽ cho các ngươi được yên nghỉ." },
  { ref: "Phi-líp 4:6", topic: "Bình an", text: "Chớ lo phiền chi hết, nhưng trong mọi sự hãy dùng lời cầu nguyện, nài xin, và sự tạ ơn mà trình các sự cầu xin của mình cho Đức Chúa Trời." },
  { ref: "Giê-rê-mi 29:11", topic: "Bình an", text: "Đức Giê-hô-va phán: Vì ta biết ý tưởng ta nghĩ đối với các ngươi, là ý tưởng bình an, không phải tai nạn, để cho các ngươi được sự trông cậy về sau rốt." },
  { ref: "Châm Ngôn 3:5-6", topic: "Đức tin", text: "Hãy hết lòng tin cậy Đức Giê-hô-va, chớ nương cậy nơi sự thông sáng của con. Phàm trong các việc làm của con, hãy nhận biết Ngài, thì Ngài sẽ chỉ dẫn các nẻo của con." },
  { ref: "Rô-ma 8:28", topic: "Đức tin", text: "Chúng ta biết rằng mọi sự hiệp lại làm ích cho kẻ yêu mến Đức Chúa Trời, tức là cho kẻ được gọi theo ý muốn Ngài đã định." },
  { ref: "Ma-thi-ơ 6:33", topic: "Đức tin", text: "Nhưng trước hết hãy tìm kiếm nước Đức Chúa Trời và sự công bình của Ngài, thì Ngài sẽ thêm cho các ngươi mọi điều ấy nữa." },
  { ref: "Giăng 14:6", topic: "Đức tin", text: "Đức Chúa Jêsus phán rằng: Ta là đường đi, lẽ thật, và sự sống; không bởi ta thì không ai được đến cùng Cha." },
  { ref: "Phi-líp 4:13", topic: "Dũng cảm", text: "Tôi làm được mọi sự nhờ Đấng ban thêm sức cho tôi." },
  { ref: "Ê-sai 41:10", topic: "Dũng cảm", text: "Đừng sợ, vì ta ở với ngươi; đừng kinh hoàng, vì ta là Đức Chúa Trời ngươi. Ta sẽ bổ sức cho ngươi, sẵn lòng giúp đỡ ngươi, lấy tay hữu công bình ta mà nâng đỡ ngươi." },
  { ref: "Giô-suê 1:9", topic: "Dũng cảm", text: "Ta há chẳng đã dặn ngươi sao? Hãy mạnh mẽ lên và có lòng can đảm; đừng sợ hãi, đừng kinh khủng, vì Giê-hô-va Đức Chúa Trời ngươi ở cùng ngươi trong mọi nơi ngươi đi." },
  { ref: "1 Ti-mô-thê 4:12", topic: "Tuổi trẻ", text: "Chớ để ai khinh con vì trẻ tuổi; nhưng phải lấy lời nói, nết làm, sự yêu thương, đức tin, sự tinh sạch mà làm gương cho các tín đồ." },
  { ref: "Thi Thiên 119:9", topic: "Tuổi trẻ", text: "Người trẻ tuổi phải làm sao cho đường lối mình được trong sạch? Phải cẩn thận theo lời Chúa." },
  { ref: "Thi Thiên 119:105", topic: "Lời Chúa", text: "Lời Chúa là ngọn đèn cho chân tôi, ánh sáng cho đường lối tôi." },
];
