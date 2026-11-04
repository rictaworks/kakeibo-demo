// 節約提案ルールのルール名と閾値（旧 backend/services/suggester.py の定数を移植）。

export const SUGGESTION_RULE = {
  DINING: "dining",
  FREQUENCY: "frequency",
  MONTHLY_DIFF: "monthly_diff",
  BUDGET_PACE: "budget_pace",
  CATEGORY_RATIO: "category_ratio",
} as const;

export const SUGGESTION_CONFIG = {
  MAX_SUGGESTIONS: 3,
  DINING_THRESHOLD_AMOUNT: 30000,
  CONVENIENCE_STORE_NAMES: [
    "セブンイレブン",
    "ローソン",
    "ファミリーマート",
    "ミニストップ",
    "デイリーヤマザキ",
    "ポプラ",
    "スリーエフ",
  ] as readonly string[],
  CONVENIENCE_WEEKLY_THRESHOLD: 3,
  MONTHLY_INCREASE_RATIO: 0.2,
  BUDGET_PACE_MONTHLY_BASE: 30000,
  BUDGET_PACE_DAY: 15,
  BUDGET_PACE_RATIO: 0.6,
  CATEGORY_DOMINANT_RATIO: 0.4,
} as const;
