// Cơ sở dữ liệu SQLite (node:sqlite, có sẵn trong Node ≥ 22.13) và các bước nâng cấp schema.
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const MIGRATIONS = [
  `CREATE TABLE groups (
     id INTEGER PRIMARY KEY,
     code TEXT NOT NULL UNIQUE,
     name TEXT NOT NULL,
     created_at INTEGER NOT NULL
   );
   CREATE TABLE users (
     id INTEGER PRIMARY KEY,
     group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
     name TEXT NOT NULL,
     name_key TEXT NOT NULL,
     avatar TEXT NOT NULL DEFAULT 'boy',
     role TEXT NOT NULL DEFAULT 'member',
     pin_hash TEXT,
     google_sub TEXT UNIQUE,
     email TEXT,
     failed_pins INTEGER NOT NULL DEFAULT 0,
     locked_until INTEGER NOT NULL DEFAULT 0,
     created_at INTEGER NOT NULL,
     last_seen INTEGER NOT NULL DEFAULT 0
   );
   CREATE UNIQUE INDEX users_group_name ON users(group_id, name_key) WHERE group_id IS NOT NULL;
   CREATE TABLE sessions (
     token_hash TEXT PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created_at INTEGER NOT NULL,
     expires_at INTEGER NOT NULL
   );
   CREATE INDEX sessions_user ON sessions(user_id);
   CREATE TABLE events (
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     id TEXT NOT NULL,
     day TEXT NOT NULL,
     week TEXT NOT NULL,
     at INTEGER NOT NULL,
     xp INTEGER NOT NULL,
     kind TEXT NOT NULL,
     mode TEXT NOT NULL DEFAULT '',
     rounds INTEGER NOT NULL DEFAULT 0,
     perfect INTEGER NOT NULL DEFAULT 0,
     votd INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (user_id, id)
   );
   CREATE INDEX events_week ON events(week, user_id);
   CREATE INDEX events_day ON events(user_id, day);
   CREATE TABLE user_verses (
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     verse_id TEXT NOT NULL,
     box INTEGER NOT NULL,
     due TEXT NOT NULL,
     seen INTEGER NOT NULL,
     correct INTEGER NOT NULL,
     last_up TEXT NOT NULL,
     at INTEGER NOT NULL,
     PRIMARY KEY (user_id, verse_id)
   );
   CREATE TABLE user_badges (
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     badge_id TEXT NOT NULL,
     day TEXT NOT NULL,
     PRIMARY KEY (user_id, badge_id)
   );
   CREATE TABLE user_days (
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     day TEXT NOT NULL,
     PRIMARY KEY (user_id, day)
   );
   CREATE TABLE weekly_verses (
     group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
     week TEXT NOT NULL,
     verse_id TEXT NOT NULL,
     ref TEXT NOT NULL,
     text TEXT NOT NULL,
     set_by INTEGER,
     set_at INTEGER NOT NULL,
     PRIMARY KEY (group_id, week)
   );`,
];

export function openDb(file = ":memory:") {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA synchronous = NORMAL;");
  const version = db.prepare("PRAGMA user_version").get().user_version;
  for (let v = version; v < MIGRATIONS.length; v++) {
    tx(db, () => {
      db.exec(MIGRATIONS[v]);
      db.exec(`PRAGMA user_version = ${v + 1}`);
    });
  }
  return db;
}

export function tx(db, fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
