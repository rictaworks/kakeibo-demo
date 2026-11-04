import { CATEGORY_ID } from "../config/masterData";
import { pad2 } from "../lib/time";

export interface MonthlyTotalRow {
  year: number;
  month: number;
  total: number;
}

export interface CategoryTotalRow {
  category_id: number;
  category_name: string;
  category_icon: string;
  total: number;
  count: number;
}

export interface DailyTotalRow {
  date: string;
  total: number;
}

export interface StoreVisitRow {
  date: string;
  store_name: string;
}

export interface TopCategoryRow {
  category_name: string;
  total: number;
}

/**
 * ダッシュボード集計用の読み取り。旧 DashboardService と SuggesterService の SQL を
 * そのまま D1 に移植（strftime による年月抽出と ownerKey による絞り込み）。
 */
export class DashboardRepository {
  constructor(private readonly db: D1Database) {}

  async monthlyTotals(ownerKey: string, year: number, month: number): Promise<MonthlyTotalRow[]> {
    const result = await this.db
      .prepare(
        `SELECT CAST(strftime('%Y', date) AS INTEGER) AS year,
                CAST(strftime('%m', date) AS INTEGER) AS month,
                SUM(amount) AS total
         FROM expenses
         WHERE session_id = ?1 AND strftime('%Y', date) = ?2 AND strftime('%m', date) = ?3
         GROUP BY year, month`,
      )
      .bind(ownerKey, String(year), pad2(month))
      .all<MonthlyTotalRow>();
    return result.results;
  }

  async categoryTotals(ownerKey: string, year: number, month: number): Promise<CategoryTotalRow[]> {
    const result = await this.db
      .prepare(
        `SELECT c.id AS category_id,
                c.name AS category_name,
                c.icon AS category_icon,
                COALESCE(SUM(e.amount), 0) AS total,
                COUNT(e.id) AS count
         FROM categories c
         LEFT JOIN expenses e
           ON c.id = e.category_id
          AND e.session_id = ?1
          AND strftime('%Y', e.date) = ?2
          AND strftime('%m', e.date) = ?3
         GROUP BY c.id, c.name, c.icon
         ORDER BY total DESC, c.id ASC`,
      )
      .bind(ownerKey, String(year), pad2(month))
      .all<CategoryTotalRow>();
    return result.results;
  }

  async dailySeries(ownerKey: string, year: number, month: number): Promise<DailyTotalRow[]> {
    const result = await this.db
      .prepare(
        `SELECT date, SUM(amount) AS total
         FROM expenses
         WHERE session_id = ?1 AND strftime('%Y', date) = ?2 AND strftime('%m', date) = ?3
         GROUP BY date
         ORDER BY date ASC`,
      )
      .bind(ownerKey, String(year), pad2(month))
      .all<DailyTotalRow>();
    return result.results;
  }

  async monthTotal(ownerKey: string, year: number, month: number): Promise<number> {
    const row = await this.db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM expenses
         WHERE session_id = ?1 AND strftime('%Y', date) = ?2 AND strftime('%m', date) = ?3`,
      )
      .bind(ownerKey, String(year), pad2(month))
      .first<{ total: number }>();
    return row?.total ?? 0;
  }

  async diningTotal(ownerKey: string, year: number, month: number): Promise<number> {
    const row = await this.db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM expenses
         WHERE session_id = ?1 AND category_id = ?2
           AND strftime('%Y', date) = ?3 AND strftime('%m', date) = ?4`,
      )
      .bind(ownerKey, CATEGORY_ID.DINING, String(year), pad2(month))
      .first<{ total: number }>();
    return row?.total ?? 0;
  }

  /** 店舗名のある支出（コンビニ判定は suggester 側で行う）。 */
  async storeVisits(ownerKey: string, year: number, month: number): Promise<StoreVisitRow[]> {
    const result = await this.db
      .prepare(
        `SELECT date, store_name
         FROM expenses
         WHERE session_id = ?1 AND strftime('%Y', date) = ?2 AND strftime('%m', date) = ?3
           AND store_name IS NOT NULL`,
      )
      .bind(ownerKey, String(year), pad2(month))
      .all<StoreVisitRow>();
    return result.results;
  }

  /** 月初から指定日（含む）までの支出合計。 */
  async totalUpTo(ownerKey: string, year: number, month: number, untilIso: string): Promise<number> {
    const row = await this.db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM expenses
         WHERE session_id = ?1 AND strftime('%Y', date) = ?2 AND strftime('%m', date) = ?3
           AND date <= ?4`,
      )
      .bind(ownerKey, String(year), pad2(month), untilIso)
      .first<{ total: number }>();
    return row?.total ?? 0;
  }

  /** 支出額が最大のカテゴリ（0 件のカテゴリも含めて比較する旧実装と同じ条件）。 */
  async topCategory(ownerKey: string, year: number, month: number): Promise<TopCategoryRow | null> {
    const row = await this.db
      .prepare(
        `SELECT c.name AS category_name, COALESCE(SUM(e.amount), 0) AS total
         FROM categories c
         LEFT JOIN expenses e
           ON c.id = e.category_id
          AND e.session_id = ?1
          AND strftime('%Y', e.date) = ?2
          AND strftime('%m', e.date) = ?3
         GROUP BY c.id, c.name
         ORDER BY total DESC, c.id ASC
         LIMIT 1`,
      )
      .bind(ownerKey, String(year), pad2(month))
      .first<TopCategoryRow>();
    return row ?? null;
  }
}
