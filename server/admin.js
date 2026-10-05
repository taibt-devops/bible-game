// Thao tác quản trị dùng chung cho dòng lệnh (server/cli.js) và lúc khởi động (SEED_DEMO=1).
import { tx } from "./db.js";
import { hashPin, nameKey, cleanName, cleanGroupName, validPin, newGroupCode, cleanCode } from "./auth.js";

export const DEMO = { code: "MANNA7", group: "Nhóm thử Manna", leader: "Nhóm trưởng", pin: "1234" };

function uniqueCode(db) {
  for (let i = 0; i < 20; i++) {
    const code = newGroupCode();
    if (!db.prepare("SELECT 1 FROM groups WHERE code = ?").get(code)) return code;
  }
  throw new Error("Không tạo được mã nhóm");
}

// Tạo nhóm kèm một nhóm trưởng đăng nhập bằng PIN. Trả về { code, groupId }.
export function createGroup(db, { group, leader, pin, code }) {
  const groupName = cleanGroupName(group);
  const leaderName = cleanName(leader);
  if (!groupName) throw new Error("Tên nhóm cần 2–40 ký tự.");
  if (!leaderName) throw new Error("Tên nhóm trưởng cần 2–20 ký tự (chữ, số, khoảng trắng).");
  if (!validPin(pin)) throw new Error("PIN gồm 4 đến 6 chữ số.");
  const finalCode = code ? cleanCode(code) : uniqueCode(db);
  if (db.prepare("SELECT 1 FROM groups WHERE code = ?").get(finalCode)) throw new Error(`Mã ${finalCode} đã có nhóm dùng.`);
  return tx(db, () => {
    const now = Date.now();
    const groupId = db.prepare("INSERT INTO groups (code, name, created_at) VALUES (?, ?, ?)").run(finalCode, groupName, now).lastInsertRowid;
    db.prepare("INSERT INTO users (group_id, name, name_key, role, pin_hash, created_at, last_seen) VALUES (?, ?, ?, 'leader', ?, ?, ?)")
      .run(groupId, leaderName, nameKey(leaderName), hashPin(pin), now, now);
    return { code: finalCode, groupId };
  });
}

// Nhóm thử để chạy ở máy / Docker: chỉ tạo nếu chưa có.
export function seedDemo(db) {
  if (db.prepare("SELECT 1 FROM groups WHERE code = ?").get(DEMO.code)) return false;
  createGroup(db, DEMO);
  return true;
}

export function listGroups(db) {
  return db.prepare(`SELECT g.code, g.name, COUNT(u.id) AS members,
      SUM(u.role = 'leader') AS leaders, datetime(g.created_at / 1000, 'unixepoch') AS created
    FROM groups g LEFT JOIN users u ON u.group_id = g.id GROUP BY g.id ORDER BY g.created_at`).all();
}

export function listMembers(db, code) {
  const g = db.prepare("SELECT * FROM groups WHERE code = ?").get(cleanCode(code));
  if (!g) throw new Error("Không có nhóm với mã này.");
  return db.prepare(`SELECT u.name, u.role, u.pin_hash IS NOT NULL AS pin, u.google_sub IS NOT NULL AS google,
      COALESCE((SELECT SUM(xp) FROM events e WHERE e.user_id = u.id), 0) AS xp
    FROM users u WHERE u.group_id = ? ORDER BY u.role = 'leader' DESC, u.name_key`).all(g.id);
}

export function resetPin(db, code, name, pin) {
  if (!validPin(pin)) throw new Error("PIN gồm 4 đến 6 chữ số.");
  const g = db.prepare("SELECT * FROM groups WHERE code = ?").get(cleanCode(code));
  if (!g) throw new Error("Không có nhóm với mã này.");
  const u = db.prepare("SELECT * FROM users WHERE group_id = ? AND name_key = ?").get(g.id, nameKey(cleanName(name) || ""));
  if (!u) throw new Error("Không có thành viên này trong nhóm.");
  db.prepare("UPDATE users SET pin_hash = ?, failed_pins = 0, locked_until = 0 WHERE id = ?").run(hashPin(pin), u.id);
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(u.id);
}

export function backup(db, file) {
  db.prepare("VACUUM INTO ?").run(file);
}
