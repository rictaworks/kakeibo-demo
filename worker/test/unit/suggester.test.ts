import { describe, expect, it } from "vitest";
import { buildSuggestions, type SuggestionInput } from "../../src/services/suggester";

const base: SuggestionInput = {
  year: 2026,
  month: 5,
  todayIso: "2026-06-01",
  diningTotal: 0,
  storeVisits: [],
  currentMonthTotal: 0,
  previousMonthTotal: 0,
  firstHalfTotal: 0,
  topCategory: null,
  grandTotal: 0,
};

describe("節約提案の 5 ルール（SPEC/api/dashboard.md）", () => {
  it("dining: 外食 30,000 円以上で提案し、金額を桁区切りで表示する", () => {
    const [suggestion] = buildSuggestions({ ...base, diningTotal: 35000 });
    expect(suggestion).toEqual({
      rule: "dining",
      message: "今月の外食費が35,000円です。自炊を増やすと節約できます。",
      amount: 35000,
    });
    expect(buildSuggestions({ ...base, diningTotal: 29999 })).toEqual([]);
  });

  it("frequency: コンビニを同じ ISO 週で 3 回以上使うと提案する", () => {
    const visits = [
      { date: "2026-05-04", storeName: "セブンイレブン 渋谷店" },
      { date: "2026-05-05", storeName: "ローソン" },
      { date: "2026-05-06", storeName: "ファミリーマート" },
      { date: "2026-05-12", storeName: "セブンイレブン" },
      { date: "2026-05-13", storeName: "イオン" },
    ];
    const [suggestion] = buildSuggestions({ ...base, storeVisits: visits });
    expect(suggestion).toMatchObject({ rule: "frequency", count: 3 });
    expect(suggestion?.message).toBe("コンビニを週3回以上利用しています。まとめ買いで節約できます。");
  });

  it("monthly_diff: 先月比 +20% 以上で提案し、先月が 0 円なら提案しない", () => {
    const [suggestion] = buildSuggestions({ ...base, currentMonthTotal: 12000, previousMonthTotal: 10000 });
    expect(suggestion).toMatchObject({ rule: "monthly_diff", ratio: 0.2 });
    expect(suggestion?.message).toBe("先月と比べて支出が20%増加しています。支出を見直しましょう。");
    expect(buildSuggestions({ ...base, currentMonthTotal: 12000, previousMonthTotal: 0 })).toEqual([]);
  });

  it("budget_pace: 当月 15 日以降かつ前半の支出が 18,000 円超で提案する", () => {
    const input = { ...base, todayIso: "2026-05-15", firstHalfTotal: 18001 };
    const [suggestion] = buildSuggestions(input);
    expect(suggestion).toMatchObject({ rule: "budget_pace", amount: 18001 });
    expect(suggestion?.message).toBe(
      "月の前半で18,001円使っています。このペースでは月30,000円を超える可能性があります。",
    );
    expect(buildSuggestions({ ...input, todayIso: "2026-05-14" })).toEqual([]);
    expect(buildSuggestions({ ...input, todayIso: "2026-06-15" })).toEqual([]);
  });

  it("category_ratio: 1 カテゴリが全体の 40% 以上で提案する", () => {
    const [suggestion] = buildSuggestions({
      ...base,
      topCategory: { name: "食料品", total: 4000 },
      grandTotal: 10000,
    });
    expect(suggestion).toMatchObject({ rule: "category_ratio", category_name: "食料品", ratio: 0.4 });
    expect(suggestion?.message).toBe("「食料品」が全体の40%を占めています。バランスよく支出を管理しましょう。");
  });

  it("提案は定義順に最大 3 件まで返す", () => {
    const input: SuggestionInput = {
      ...base,
      diningTotal: 40000,
      storeVisits: [
        { date: "2026-05-04", storeName: "ローソン" },
        { date: "2026-05-05", storeName: "ローソン" },
        { date: "2026-05-06", storeName: "ローソン" },
      ],
      currentMonthTotal: 50000,
      previousMonthTotal: 10000,
      topCategory: { name: "外食", total: 40000 },
      grandTotal: 50000,
    };
    const rules = buildSuggestions(input).map((suggestion) => suggestion.rule);
    expect(rules).toEqual(["dining", "frequency", "monthly_diff"]);
  });

  it("何も該当しなければ空配列", () => {
    expect(buildSuggestions(base)).toEqual([]);
  });
});
