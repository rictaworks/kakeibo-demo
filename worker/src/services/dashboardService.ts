import { DashboardRepository, type CategoryTotalRow, type DailyTotalRow, type MonthlyTotalRow } from "../db/dashboardRepository";
import { SUGGESTION_CONFIG } from "../config/suggestionRules";
import { buildSuggestions, type Suggestion, type SuggestionInput } from "./suggester";
import { jstTodayIso, pad2 } from "../lib/time";

export interface DashboardResponse {
  monthly_totals: MonthlyTotalRow[];
  category_totals: CategoryTotalRow[];
  daily_series: DailyTotalRow[];
  suggestions: Suggestion[];
}

/** GET /api/dashboard の集計。集計と節約提案をまとめて組み立てる。 */
export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  async build(ownerKey: string, year: number, month: number, now: Date): Promise<DashboardResponse> {
    const todayIso = jstTodayIso(now);
    const previous = previousYearMonth(year, month);
    const midMonthIso = `${year}-${pad2(month)}-${pad2(SUGGESTION_CONFIG.BUDGET_PACE_DAY)}`;

    const [monthlyTotals, categoryTotals, dailySeries, diningTotal, storeVisits, currentMonthTotal, previousMonthTotal, firstHalfTotal, topCategory] =
      await Promise.all([
        this.repository.monthlyTotals(ownerKey, year, month),
        this.repository.categoryTotals(ownerKey, year, month),
        this.repository.dailySeries(ownerKey, year, month),
        this.repository.diningTotal(ownerKey, year, month),
        this.repository.storeVisits(ownerKey, year, month),
        this.repository.monthTotal(ownerKey, year, month),
        this.repository.monthTotal(ownerKey, previous.year, previous.month),
        this.repository.totalUpTo(ownerKey, year, month, midMonthIso),
        this.repository.topCategory(ownerKey, year, month),
      ]);

    const input: SuggestionInput = {
      year,
      month,
      todayIso,
      diningTotal,
      storeVisits: storeVisits.map((visit) => ({ date: visit.date, storeName: visit.store_name })),
      currentMonthTotal,
      previousMonthTotal,
      firstHalfTotal,
      topCategory: topCategory === null ? null : { name: topCategory.category_name, total: topCategory.total },
      grandTotal: currentMonthTotal,
    };

    return {
      monthly_totals: monthlyTotals,
      category_totals: categoryTotals,
      daily_series: dailySeries,
      suggestions: buildSuggestions(input),
    };
  }
}

function previousYearMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}
