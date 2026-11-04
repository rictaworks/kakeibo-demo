import { describe, expect, it } from "vitest";
import { CATEGORY_ID } from "../../src/config/masterData";
import { CONFIDENCE } from "../../src/config/classifierRules";
import { classifyReceipt } from "../../src/services/classifier";

describe("店舗名による分類（confidence: high）", () => {
  it.each([
    ["イオン", CATEGORY_ID.GROCERIES],
    ["マクドナルド", CATEGORY_ID.DINING],
    ["マツモトキヨシ", CATEGORY_ID.HEALTH],
    ["セブンイレブン", CATEGORY_ID.GROCERIES],
    ["JR東日本", CATEGORY_ID.TRANSPORT],
  ])("%s は高信頼度で分類される", (store, categoryId) => {
    expect(classifyReceipt(store, [], null)).toEqual({ category_id: categoryId, confidence: CONFIDENCE.HIGH });
  });
});

describe("商品名による分類（confidence: medium）", () => {
  it("牛乳は食料品、風邪薬は医療・健康", () => {
    expect(classifyReceipt(null, [{ name: "牛乳" }], 200)).toEqual({
      category_id: CATEGORY_ID.GROCERIES,
      confidence: CONFIDENCE.MEDIUM,
    });
    expect(classifyReceipt(null, [{ name: "風邪薬" }], 800)).toEqual({
      category_id: CATEGORY_ID.HEALTH,
      confidence: CONFIDENCE.MEDIUM,
    });
  });

  it("店舗名に一致しなければ商品名で判定する", () => {
    expect(classifyReceipt("不明なお店", [{ name: "牛乳" }], 200)).toEqual({
      category_id: CATEGORY_ID.GROCERIES,
      confidence: CONFIDENCE.MEDIUM,
    });
  });
});

describe("金額帯による分類（confidence: low）", () => {
  it("500 円未満は食料品、500 円以上 5,000 円未満はその他", () => {
    expect(classifyReceipt(null, [], 300)).toEqual({ category_id: CATEGORY_ID.GROCERIES, confidence: CONFIDENCE.LOW });
    expect(classifyReceipt(null, [], 1200)).toEqual({ category_id: CATEGORY_ID.OTHER, confidence: CONFIDENCE.LOW });
  });
});

describe("どれにも一致しない場合", () => {
  it("その他・confidence は null", () => {
    expect(classifyReceipt(null, [], null)).toEqual({ category_id: CATEGORY_ID.OTHER, confidence: null });
  });
});
