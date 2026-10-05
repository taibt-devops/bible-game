import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../server/db.js";
import { createGroup, seedDemo, listGroups, listMembers, resetPin, DEMO } from "../server/admin.js";
import { verifyPin } from "../server/auth.js";

test("lệnh quản trị: tạo nhóm, nhóm thử, liệt kê, đặt lại PIN", () => {
  const db = openDb(":memory:");
  assert.equal(seedDemo(db), true);
  assert.equal(seedDemo(db), false, "chạy lại không tạo trùng");
  const { code } = createGroup(db, { group: "Thanh niên Ân Điển", leader: "Anh Tú", pin: "2468" });
  assert.match(code, /^[A-Z2-9]{6}$/);
  assert.deepEqual(listGroups(db).map((g) => g.code), [DEMO.code, code]);
  assert.throws(() => createGroup(db, { group: "Nhóm khác", leader: "Ai", pin: "1111", code: DEMO.code }), /đã có nhóm/);
  assert.throws(() => createGroup(db, { group: "x", leader: "Anh Tú", pin: "1111" }), /Tên nhóm/);
  assert.throws(() => createGroup(db, { group: "Nhóm B", leader: "Anh Tú", pin: "12" }), /PIN/);
  const [leader] = listMembers(db, code.toLowerCase());
  assert.equal(leader.role, "leader");
  resetPin(db, code, "anh tú", "9999");
  assert.ok(verifyPin("9999", db.prepare("SELECT pin_hash FROM users WHERE name = 'Anh Tú'").get().pin_hash));
  assert.throws(() => resetPin(db, code, "Không Có", "1234"), /Không có thành viên/);
});
