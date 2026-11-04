// レシートの自動分類（旧 backend/services/classifier.py の RuleClassifier.classify を移植）。
// 入力は OCR の後段データ。OCR 本体は Containers 側に残すため、現時点では呼び出し元はない。

import { AMOUNT_RULES, CONFIDENCE, PRODUCT_KEYWORD_RULES, STORE_KEYWORD_RULES } from "../config/classifierRules";
import { CATEGORY_ID } from "../config/masterData";

export type Confidence = (typeof CONFIDENCE)[keyof typeof CONFIDENCE];

export interface Classification {
  category_id: number;
  confidence: Confidence | null;
}

export function classifyReceipt(
  storeName: string | null,
  items: readonly { name: string }[],
  amount: number | null,
): Classification {
  if (storeName) {
    for (const [keyword, categoryId] of STORE_KEYWORD_RULES) {
      if (storeName.includes(keyword)) {
        return { category_id: categoryId, confidence: CONFIDENCE.HIGH };
      }
    }
  }

  const itemNames = items.map((item) => item.name).join(" ");
  const combinedText = `${storeName ?? ""} ${itemNames}`;
  for (const [keyword, categoryId] of PRODUCT_KEYWORD_RULES) {
    if (combinedText.includes(keyword)) {
      return { category_id: categoryId, confidence: CONFIDENCE.MEDIUM };
    }
  }

  if (amount !== null) {
    for (const [minAmount, maxAmount, categoryId] of AMOUNT_RULES) {
      if (minAmount <= amount && amount < maxAmount) {
        return { category_id: categoryId, confidence: CONFIDENCE.LOW };
      }
    }
  }

  return { category_id: CATEGORY_ID.OTHER, confidence: null };
}
