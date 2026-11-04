export class SessionRepository {
  constructor(private readonly db: D1Database) {}

  /** ハッシュ化済みセッションIDの有効期限（ISO 文字列）。存在しなければ null。 */
  async findExpiresAt(hashedId: string): Promise<string | null> {
    const row = await this.db
      .prepare("SELECT expires_at FROM sessions WHERE id = ?1")
      .bind(hashedId)
      .first<{ expires_at: string }>();
    return row?.expires_at ?? null;
  }

  async insert(hashedId: string, createdAt: string, expiresAt: string): Promise<void> {
    await this.db
      .prepare("INSERT INTO sessions (id, created_at, expires_at) VALUES (?1, ?2, ?3)")
      .bind(hashedId, createdAt, expiresAt)
      .run();
  }

  /**
   * 発行回数を 1 増やし、そのウィンドウ内の発行数（増加後）を返す。
   * 1 文のアップサートなので、同時リクエストでも数え漏れしない。
   */
  async incrementIssuance(clientKey: string, windowStart: number): Promise<number> {
    const row = await this.db
      .prepare(
        `INSERT INTO session_issuance (client_key, window_start, issued) VALUES (?1, ?2, 1)
         ON CONFLICT (client_key, window_start) DO UPDATE SET issued = issued + 1
         RETURNING issued`,
      )
      .bind(clientKey, windowStart)
      .first<{ issued: number }>();
    if (row === null) {
      throw new Error("session issuance counter returned no row");
    }
    return row.issued;
  }
}
