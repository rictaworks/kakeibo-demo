import { describe, expect, it } from "vitest";
import { MESSAGES } from "../../src/config/messages";
import { parseExpenseInput, parseExpenseUpdate, parseIntegerQuery, parsePathId } from "../../src/lib/validation";

const valid = { date: "2026-05-31", amount: 1200, category_id: 1 };

describe("parseExpenseInput（旧 ExpenseInput の検証）", () => {
  it("必須項目が揃えば値を返し、任意項目は null にする", () => {
    const result = parseExpenseInput(valid);
    expect(result).toEqual({
      ok: true,
      value: { date: "2026-05-31", amount: 1200, category_id: 1, store_name: null, memo: null },
    });
  });

  it("日付の形式違いを拒否する", () => {
    const result = parseExpenseInput({ ...valid, date: "2026/05/31" });
    expect(result).toMatchObject({ ok: false, issues: [{ loc: ["body", "date"], msg: MESSAGES.DATE_FORMAT }] });
  });

  it("金額 0 以下を拒否する", () => {
    const result = parseExpenseInput({ ...valid, amount: 0 });
    expect(result).toMatchObject({ ok: false, issues: [{ loc: ["body", "amount"], msg: MESSAGES.AMOUNT_RANGE }] });
  });

  it("金額は 1,000 万円まで（上限ちょうどは通し、超えたら拒否する）", () => {
    expect(parseExpenseInput({ ...valid, amount: 10_000_000 }).ok).toBe(true);
    const result = parseExpenseInput({ ...valid, amount: 10_000_001 });
    expect(result).toMatchObject({ ok: false, issues: [{ loc: ["body", "amount"], msg: MESSAGES.AMOUNT_RANGE }] });
    expect(parseExpenseUpdate({ amount: 10_000_001 })).toMatchObject({ ok: false });
  });

  it("カテゴリ 9 を拒否する", () => {
    const result = parseExpenseInput({ ...valid, category_id: 9 });
    expect(result).toMatchObject({ ok: false, issues: [{ loc: ["body", "category_id"], msg: MESSAGES.CATEGORY_RANGE }] });
  });

  it("必須項目の欠落を指摘する", () => {
    const result = parseExpenseInput({});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map((issue) => issue.loc[1])).toEqual(["date", "amount", "category_id"]);
  });

  it("店舗名は 100 文字、メモは 500 文字まで（文字数はコードポイント単位）", () => {
    expect(parseExpenseInput({ ...valid, store_name: "あ".repeat(100) }).ok).toBe(true);
    expect(parseExpenseInput({ ...valid, store_name: "あ".repeat(101) }).ok).toBe(false);
    expect(parseExpenseInput({ ...valid, memo: "a".repeat(500) }).ok).toBe(true);
    expect(parseExpenseInput({ ...valid, memo: "a".repeat(501) }).ok).toBe(false);
  });
});

describe("parseExpenseUpdate（部分更新）", () => {
  it("空のオブジェクトは有効（更新対象なし）", () => {
    expect(parseExpenseUpdate({})).toEqual({ ok: true, value: {} });
  });

  it("null は未指定と同じ扱い", () => {
    expect(parseExpenseUpdate({ store_name: null, amount: null })).toEqual({ ok: true, value: {} });
  });

  it("指定された項目だけを返す", () => {
    expect(parseExpenseUpdate({ amount: 1500, memo: "メモ" })).toEqual({
      ok: true,
      value: { amount: 1500, memo: "メモ" },
    });
  });
});

describe("クエリとパスの整数", () => {
  it("未指定は undefined、整数は number、非整数は入力エラー", () => {
    expect(parseIntegerQuery("year", undefined)).toEqual({ ok: true, value: undefined });
    expect(parseIntegerQuery("year", "2026")).toEqual({ ok: true, value: 2026 });
    expect(parseIntegerQuery("year", "20x6")).toMatchObject({ ok: false });
  });

  it("パス ID は正の整数のみ", () => {
    expect(parsePathId("12")).toEqual({ ok: true, value: 12 });
    expect(parsePathId("-1")).toMatchObject({ ok: false });
    expect(parsePathId("abc")).toMatchObject({ ok: false });
  });
});
