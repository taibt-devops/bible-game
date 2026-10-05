// Dòng lệnh quản trị Manna. Ví dụ (Docker): docker compose exec api node server/cli.js groups
import { openDb } from "./db.js";
import { createGroup, listGroups, listMembers, resetPin, backup, seedDemo, DEMO } from "./admin.js";

const HELP = `Cách dùng: node server/cli.js <lệnh> [tham số]

  groups                                      Liệt kê các nhóm và mã mời
  members <mã-nhóm>                           Liệt kê thành viên của nhóm
  create-group "<tên nhóm>" "<nhóm trưởng>" <pin> [mã]
                                              Tạo nhóm, nhóm trưởng đăng nhập bằng PIN
  reset-pin <mã-nhóm> "<tên>" <pin>           Đặt lại PIN cho một thành viên
  seed-demo                                   Tạo nhóm thử ${DEMO.code} (nhóm trưởng "${DEMO.leader}", PIN ${DEMO.pin})
  backup <tệp.db>                             Sao lưu cơ sở dữ liệu (an toàn khi đang chạy)

Cơ sở dữ liệu: biến DB_PATH (mặc định data/manna.db).`;

const [cmd, ...args] = process.argv.slice(2);
const db = openDb(process.env.DB_PATH || "data/manna.db");

try {
  switch (cmd) {
    case "groups":
      console.table(listGroups(db));
      break;
    case "members":
      console.table(listMembers(db, args[0] || ""));
      break;
    case "create-group": {
      const [group, leader, pin, code] = args;
      const out = createGroup(db, { group, leader, pin, code });
      console.log(`Đã tạo nhóm "${group}". Mã mời: ${out.code}. Nhóm trưởng "${leader}" đăng nhập bằng PIN đã đặt.`);
      break;
    }
    case "reset-pin":
      resetPin(db, args[0] || "", args[1] || "", args[2] || "");
      console.log("Đã đặt lại PIN.");
      break;
    case "seed-demo":
      console.log(seedDemo(db) ? `Đã tạo nhóm thử. Mã: ${DEMO.code}, nhóm trưởng: ${DEMO.leader}, PIN: ${DEMO.pin}` : `Nhóm thử ${DEMO.code} đã có sẵn.`);
      break;
    case "backup":
      if (!args[0]) throw new Error("Cần đường dẫn tệp sao lưu.");
      backup(db, args[0]);
      console.log(`Đã sao lưu vào ${args[0]}`);
      break;
    default:
      console.log(HELP);
      process.exitCode = cmd && cmd !== "help" ? 1 : 0;
  }
} catch (e) {
  console.error(`Lỗi: ${e.message}`);
  process.exitCode = 1;
} finally {
  db.close();
}
