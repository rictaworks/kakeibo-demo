// 節約提案の 5 ルール（旧 backend/services/suggester.py）。DB に依存しない純粋関数として実装し、
// 集計値を入力として受け取る（テストしやすさのため。集計は dashboardService が行う）。

import { SUGGESTION_CONFIG, SUGGESTION_RULE } from "../config/suggestionRules";
import { MESSAGES } from "../config/messages";
import { formatMessage, formatYen } from "../lib/format";
import { isoWeekNumber } from "../lib/time";

export interface SuggestionInput {
  year: number;
  month: number;
  /** JST の今日（YYYY-MM-DD）。予算ペースのルールで使う。 */
  todayIso: string;
  diningTotal: number;
  /** 当月で店舗名が記録された支出。コンビニ判定はルール側で行う。 */
  storeVisits: readonly { date: string; storeName: string }[];
  currentMonthTotal: number;
  previousMonthTotal: number;
  /** 月初〜BUDGET_PACE_DAY までの合計（予算ペースの判定に使う）。 */
  firstHalfTotal: number;
  topCategory: { name: string; total: number } | null;
  grandTotal: number;
}

export interface Suggestion {
  rule: string;
  message: string;
  amount?: number;
  count?: number;
  ratio?: number;
  category_name?: string;
}

type Rule = (input: SuggestionInput) => Suggestion | null;

const BUDGET_PACE_THRESHOLD = Math.trunc(
  SUGGESTION_CONFIG.BUDGET_PACE_MONTHLY_BASE * SUGGESTION_CONFIG.BUDGET_PACE_RATIO,
);

function diningRule(input: SuggestionInput): Suggestion | null {
  if (input.diningTotal < SUGGESTION_CONFIG.DINING_THRESHOLD_AMOUNT) return null;
  return {
    rule: SUGGESTION_RULE.DINING,
    message: formatMessage(MESSAGES.SUGGESTION_DINING, { amount: formatYen(input.diningTotal) }),
    amount: input.diningTotal,
  };
}

function frequencyRule(input: SuggestionInput): Suggestion | null {
  const weeklyCounts = new Map<number, number>();
  for (const visit of input.storeVisits) {
    const isConvenience = SUGGESTION_CONFIG.CONVENIENCE_STORE_NAMES.some((name) => visit.storeName.includes(name));
    if (!isConvenience) continue;
    const week = isoWeekNumber(visit.date);
    if (week === null) continue;
    weeklyCounts.set(week, (weeklyCounts.get(week) ?? 0) + 1);
  }
  const maxWeekly = [...weeklyCounts.values()].reduce((max, count) => Math.max(max, count), 0);
  if (maxWeekly < SUGGESTION_CONFIG.CONVENIENCE_WEEKLY_THRESHOLD) return null;
  return {
    rule: SUGGESTION_RULE.FREQUENCY,
    message: formatMessage(MESSAGES.SUGGESTION_FREQUENCY, { count: maxWeekly }),
    count: maxWeekly,
  };
}

function monthlyDiffRule(input: SuggestionInput): Suggestion | null {
  if (input.previousMonthTotal === 0) return null;
  const increaseRatio = (input.currentMonthTotal - input.previousMonthTotal) / input.previousMonthTotal;
  if (increaseRatio < SUGGESTION_CONFIG.MONTHLY_INCREASE_RATIO) return null;
  return {
    rule: SUGGESTION_RULE.MONTHLY_DIFF,
    message: formatMessage(MESSAGES.SUGGESTION_MONTHLY_DIFF, { percent: Math.trunc(increaseRatio * 100) }),
    ratio: increaseRatio,
  };
}

/** 予算ペースは当月のうち BUDGET_PACE_DAY 以降（同じ年月の場合）にのみ評価する。 */
function isBudgetPaceDay(input: SuggestionInput): boolean {
  const [year, month, day] = input.todayIso.split("-").map(Number) as [number, number, number];
  return year === input.year && month === input.month && day >= SUGGESTION_CONFIG.BUDGET_PACE_DAY;
}

function budgetPaceRule(input: SuggestionInput): Suggestion | null {
  if (!isBudgetPaceDay(input)) return null;
  if (input.firstHalfTotal <= BUDGET_PACE_THRESHOLD) return null;
  return {
    rule: SUGGESTION_RULE.BUDGET_PACE,
    message: formatMessage(MESSAGES.SUGGESTION_BUDGET_PACE, {
      amount: formatYen(input.firstHalfTotal),
      monthlyBase: formatYen(SUGGESTION_CONFIG.BUDGET_PACE_MONTHLY_BASE),
    }),
    amount: input.firstHalfTotal,
  };
}

function categoryRatioRule(input: SuggestionInput): Suggestion | null {
  if (input.grandTotal === 0 || input.topCategory === null) return null;
  const ratio = input.topCategory.total / input.grandTotal;
  if (ratio < SUGGESTION_CONFIG.CATEGORY_DOMINANT_RATIO) return null;
  return {
    rule: SUGGESTION_RULE.CATEGORY_RATIO,
    message: formatMessage(MESSAGES.SUGGESTION_CATEGORY_RATIO, {
      category: input.topCategory.name,
      percent: Math.trunc(ratio * 100),
    }),
    category_name: input.topCategory.name,
    ratio,
  };
}

const RULES: readonly Rule[] = [diningRule, frequencyRule, monthlyDiffRule, budgetPaceRule, categoryRatioRule];

/** ルールを定義順に評価し、最大 MAX_SUGGESTIONS 件を返す。 */
export function buildSuggestions(input: SuggestionInput): Suggestion[] {
  const suggestions: Suggestion[] = [];
  for (const rule of RULES) {
    if (suggestions.length >= SUGGESTION_CONFIG.MAX_SUGGESTIONS) break;
    const suggestion = rule(input);
    if (suggestion !== null) suggestions.push(suggestion);
  }
  return suggestions;
}
