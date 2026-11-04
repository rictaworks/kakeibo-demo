-- SPEC/diagrams/er.md に対応する D1 スキーマ（旧 backend/models/db.py の CREATE 文を移植）。
-- categories はマスタ（リセット対象外）。sessions / expenses は日次リセットで全削除する。

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,                -- UUIDv4 を SHA-256 ハッシュ化した値（オーナーキー）
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL            -- 作成から24時間後
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL                  -- FontAwesome クラス名
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  category_id INTEGER NOT NULL REFERENCES categories(id),
  date TEXT NOT NULL,                 -- YYYY-MM-DD
  amount INTEGER NOT NULL CHECK (amount > 0),
  store_name TEXT,
  memo TEXT,
  ocr_raw_text TEXT,                  -- デバッグ用・NULL許容（OCR は Containers 側）
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expenses_session_date ON expenses (session_id, date);

INSERT OR IGNORE INTO categories (id, name, icon) VALUES
  (1, '食料品', 'fa-solid fa-basket-shopping'),
  (2, '外食', 'fa-solid fa-utensils'),
  (3, '交通', 'fa-solid fa-train'),
  (4, '医療・健康', 'fa-solid fa-heart-pulse'),
  (5, '衣類・美容', 'fa-solid fa-shirt'),
  (6, '日用品', 'fa-solid fa-soap'),
  (7, '娯楽', 'fa-solid fa-gamepad'),
  (8, 'その他', 'fa-solid fa-circle-dot');
