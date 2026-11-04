import type { ExpenseInput, ExpenseUpdate } from "../lib/validation";

/** 更新可能な列。ExpenseUpdate のキーと一致させ、SQL に入るのはこの一覧の列名だけにする。 */
const UPDATABLE_COLUMNS: readonly (keyof ExpenseUpdate)[] = [
  "date",
  "amount",
  "category_id",
  "store_name",
  "memo",
];

/** 支出一覧の 1 行（カテゴリ名・アイコンを結合済み）。 */
export interface ExpenseRow {
  id: number;
  session_id: string;
  category_id: number;
  date: string;
  amount: number;
  store_name: string | null;
  memo: string | null;
  ocr_raw_text: string | null;
  created_at: string;
  updated_at: string;
  category_name: string;
  category_icon: string;
}

/**
 * 支出テーブルへのアクセス。すべての参照条件に ownerKey（session_id）を含め、
 * 他セッションのデータに到達できないようにする（旧 FastAPI 実装と同じ）。
 */
export class ExpenseRepository {
  constructor(private readonly db: D1Database) {}

  async insert(ownerKey: string, input: ExpenseInput, nowIso: string): Promise<number> {
    const result = await this.db
      .prepare(
        `INSERT INTO expenses (session_id, category_id, date, amount, store_name, memo, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)`,
      )
      .bind(
        ownerKey,
        input.category_id,
        input.date,
        input.amount,
        input.store_name,
        input.memo,
        nowIso,
      )
      .run();
    return result.meta.last_row_id;
  }

  async listBySession(ownerKey: string): Promise<ExpenseRow[]> {
    const result = await this.db
      .prepare(
        `SELECT e.id, e.session_id, e.category_id, e.date, e.amount, e.store_name, e.memo,
                e.ocr_raw_text, e.created_at, e.updated_at,
                c.name AS category_name, c.icon AS category_icon
         FROM expenses e
         JOIN categories c ON e.category_id = c.id
         WHERE e.session_id = ?1
         ORDER BY e.date DESC, e.created_at DESC, e.id DESC`,
      )
      .bind(ownerKey)
      .all<ExpenseRow>();
    return result.results;
  }

  async existsForSession(id: number, ownerKey: string): Promise<boolean> {
    const row = await this.db
      .prepare("SELECT id FROM expenses WHERE id = ?1 AND session_id = ?2")
      .bind(id, ownerKey)
      .first<{ id: number }>();
    return row !== null;
  }

  /** fields は parseExpenseUpdate が返した値のみ。列名は UPDATABLE_COLUMNS で検証する。 */
  async update(id: number, ownerKey: string, fields: ExpenseUpdate, nowIso: string): Promise<void> {
    const columns = Object.keys(fields) as (keyof ExpenseUpdate)[];
    for (const column of columns) {
      if (!UPDATABLE_COLUMNS.includes(column)) {
        throw new Error(`column is not updatable: ${column}`);
      }
    }
    const assignments = [...columns.map((column, index) => `${column} = ?${index + 1}`), `updated_at = ?${columns.length + 1}`];
    const values: (string | number)[] = [
      ...columns.map((column) => fields[column] as string | number),
      nowIso,
    ];
    await this.db
      .prepare(
        `UPDATE expenses SET ${assignments.join(", ")}
         WHERE id = ?${columns.length + 2} AND session_id = ?${columns.length + 3}`,
      )
      .bind(...values, id, ownerKey)
      .run();
  }

  async delete(id: number, ownerKey: string): Promise<void> {
    await this.db
      .prepare("DELETE FROM expenses WHERE id = ?1 AND session_id = ?2")
      .bind(id, ownerKey)
      .run();
  }
}
