import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "./config";

// Each entry upgrades the schema by one version (tracked with PRAGMA user_version).
const MIGRATIONS = [
  `CREATE TABLE sessions (
     id TEXT PRIMARY KEY,
     user_id TEXT NOT NULL,
     user_name TEXT NOT NULL,
     display_name TEXT NOT NULL,
     auth_kind TEXT NOT NULL,
     secret_enc TEXT,
     created_at TEXT NOT NULL,
     expires_at TEXT NOT NULL
   );
   CREATE TABLE timers (
     user_id TEXT PRIMARY KEY,
     work_item_id INTEGER NOT NULL,
     title TEXT NOT NULL,
     project TEXT NOT NULL,
     task_type TEXT,
     parent_title TEXT,
     started_at TEXT NOT NULL
   );
   CREATE TABLE settings (
     key TEXT PRIMARY KEY,
     value TEXT NOT NULL
   );`,
  // Time tracked locally by the timer; pushed to the log server later, one log per task per day.
  `CREATE TABLE entries (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id TEXT NOT NULL,
     work_item_id INTEGER NOT NULL,
     title TEXT NOT NULL,
     project TEXT NOT NULL,
     task_type TEXT,
     parent_title TEXT,
     day TEXT NOT NULL,
     started_at TEXT NOT NULL,
     seconds INTEGER NOT NULL,
     status TEXT NOT NULL DEFAULT 'pending',
     created_at TEXT NOT NULL
   );
   CREATE INDEX entries_user_status ON entries (user_id, status, day);`,
  // Each timer run is tagged with the log type (Code, Test, ...) chosen while it runs.
  `ALTER TABLE timers ADD COLUMN log_type TEXT;
   ALTER TABLE entries ADD COLUMN log_type TEXT;`,
];

const g = globalThis as unknown as { __db?: DatabaseSync };

function open(): DatabaseSync {
  mkdirSync(dirname(config.dbPath), { recursive: true });
  const db = new DatabaseSync(config.dbPath);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  const row = db.prepare("PRAGMA user_version").get() as { user_version: number };
  for (let v = row.user_version; v < MIGRATIONS.length; v++) {
    db.exec("BEGIN");
    db.exec(MIGRATIONS[v]);
    db.exec(`PRAGMA user_version = ${v + 1}`);
    db.exec("COMMIT");
  }
  return db;
}

// Kept on globalThis so dev-mode hot reloads reuse one connection.
export const db = (): DatabaseSync => (g.__db ??= open());
