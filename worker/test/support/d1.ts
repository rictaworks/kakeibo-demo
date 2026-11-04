// テスト用の D1 互換アダプタ（node:sqlite の上に prepare().bind().first()/all()/run() と batch() を実装）。
// 本番と同じ migrations/*.sql を番号順に適用するため、SQL 方言は本番と一致する。

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const here = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(here, "../../../migrations");

type BindValue = string | number | null;

export interface RunResult {
  success: boolean;
  results: unknown[];
  meta: { changes: number; last_row_id: number };
}

export class SqliteStatement {
  private params: BindValue[] = [];

  constructor(
    private readonly db: DatabaseSync,
    private readonly sql: string,
  ) {}

  bind(...values: BindValue[]): SqliteStatement {
    this.params = values;
    return this;
  }

  async first<T>(): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...this.params) as T | undefined;
    return row ?? null;
  }

  async all<T>(): Promise<{ results: T[]; success: boolean }> {
    const rows = this.db.prepare(this.sql).all(...this.params) as T[];
    return { results: rows, success: true };
  }

  async run(): Promise<RunResult> {
    const info = this.db.prepare(this.sql).run(...this.params);
    return {
      success: true,
      results: [],
      meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) },
    };
  }
}

export class SqliteD1 {
  private readonly db: DatabaseSync;

  constructor() {
    this.db = new DatabaseSync(":memory:");
    this.db.exec("PRAGMA foreign_keys = ON");
    const files = readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith(".sql")).sort();
    for (const file of files) {
      this.db.exec(readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"));
    }
  }

  prepare(sql: string): SqliteStatement {
    return new SqliteStatement(this.db, sql);
  }

  /** D1 の batch と同じく 1 トランザクションで実行する。 */
  async batch(statements: SqliteStatement[]): Promise<RunResult[]> {
    this.db.exec("BEGIN");
    try {
      const results: RunResult[] = [];
      for (const statement of statements) {
        results.push(await statement.run());
      }
      this.db.exec("COMMIT");
      return results;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  /** 生の SQL を直接実行する（テストでの状態確認・時刻の書き換え用）。 */
  exec(sql: string): void {
    this.db.exec(sql);
  }

  asD1Database(): D1Database {
    return this as unknown as D1Database;
  }

  close(): void {
    this.db.close();
  }
}
