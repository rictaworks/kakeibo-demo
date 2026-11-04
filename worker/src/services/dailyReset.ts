import type { Logger } from "../lib/logger";

/**
 * 日次リセット（JST 03:00）。sessions・expenses・発行回数の記録を削除する。
 * categories はマスタのため対象外。DELETE は D1 の batch（1 トランザクション）で実行するため、
 * 途中で失敗しても半端な状態は残らない。失敗は握りつぶさず再送出する。
 */
export async function runDailyReset(db: D1Database, logger: Logger): Promise<void> {
  logger.info("daily reset started");
  try {
    await db.batch([
      db.prepare("DELETE FROM expenses"),
      db.prepare("DELETE FROM sessions"),
      db.prepare("DELETE FROM session_issuance"),
    ]);
  } catch (error) {
    logger.error("daily reset failed", { reason: error instanceof Error ? error.message : String(error) });
    throw error;
  }
  logger.info("daily reset completed");
}
