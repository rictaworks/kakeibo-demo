-- Cookie なしのリクエストで発行するセッションの回数制限（固定ウィンドウ）。
-- client_key はクライアント IP の SHA-256（生の IP は保存しない）。window_start は UNIX 秒で
-- ウィンドウの開始時刻。日次リセットで全件削除する（worker/src/services/dailyReset.ts）。

CREATE TABLE IF NOT EXISTS session_issuance (
  client_key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  issued INTEGER NOT NULL CHECK (issued >= 0),
  PRIMARY KEY (client_key, window_start)
);
